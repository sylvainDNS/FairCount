# Deployment Guide

This guide explains how to deploy FairCount to Cloudflare.

## Prerequisites

- Cloudflare account
- GitHub repository with Actions enabled
- Domain configured (optional)

## Architecture

- **Frontend**: Cloudflare Pages (`faircount`)
- **Backend**: Cloudflare Worker (`faircount-api`)
- **Database**: Cloudflare D1 (`faircount-db`)
- **Storage**: Cloudflare R2 (`faircount-storage`) - optional

## 1. Create Cloudflare Resources

### D1 Database

```bash
pnpm exec wrangler d1 create faircount-db
```

Save the `database_id` for later.

### Pages Project

```bash
pnpm exec wrangler pages project create faircount
```

### R2 Bucket (optional)

```bash
pnpm exec wrangler r2 bucket create faircount-storage
```

## 2. Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**.

Add these secrets:

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | API token for deployments | [Create token](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Dashboard → Workers & Pages → Account ID |
| `CLOUDFLARE_D1_DATABASE_ID` | D1 database UUID | From `wrangler d1 create` output |

### API Token Permissions

Create a custom token with these permissions:

- **Account** → Cloudflare Pages: Edit
- **Account** → Workers Scripts: Edit
- **Account** → D1: Edit (if running migrations in CI)
- **Account** → Workers R2 Storage: Edit (if using R2)

## 3. Configure Cloudflare Worker Secrets

These secrets are stored in Cloudflare (not GitHub) and used at runtime by the Worker.

```bash
# Authentication (generate with: openssl rand -base64 32)
pnpm exec wrangler secret put AUTH_SECRET

# SMTP Configuration
pnpm exec wrangler secret put SMTP_HOST      # e.g., smtp.protonmail.ch
pnpm exec wrangler secret put SMTP_PORT      # e.g., 587
pnpm exec wrangler secret put SMTP_USER      # e.g., noreply@faircount.app
pnpm exec wrangler secret put SMTP_PASS      # your SMTP password
pnpm exec wrangler secret put SMTP_FROM      # e.g., noreply@faircount.app
```

### Secrets Reference

| Secret | Description | Example |
|--------|-------------|---------|
| `AUTH_SECRET` | Session encryption key (32+ chars) | `openssl rand -base64 32` |
| `SMTP_HOST` | SMTP server hostname | `smtp.protonmail.ch` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username/email | `noreply@faircount.app` |
| `SMTP_PASS` | SMTP password | - |
| `SMTP_FROM` | Sender email address | `noreply@faircount.app` |

## 4. Environment Variables

These are configured in `wrangler.toml` and are public (non-sensitive).

| Variable | Value in `wrangler.toml` | Local override in `.dev.vars` |
|----------|--------------------------|-------------------------------|
| `APP_URL` | `https://faircount.sylvaindenyse.me` | `http://localhost:3000` |
| `APP_NAME` | `FairCount` | - |

For local development, copy `.dev.vars.example` to `.dev.vars` to override production values.

## 5. Database Migrations

### Run migrations manually

```bash
# Local
pnpm db:migrate

# Production
pnpm exec wrangler d1 migrations apply faircount-db --remote
```

### Run migrations in CI (optional)

Add this step to `.github/workflows/deploy.yml` before deploying the Worker:

```yaml
- name: Run D1 Migrations
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: d1 migrations apply faircount-db --remote
```

## 6. Deploy

Push to `main` branch to trigger automatic deployment:

```bash
git push origin main
```

Or deploy manually:

```bash
# Build frontend
pnpm build

# Deploy Pages
pnpm exec wrangler pages deploy dist --project-name=faircount

# Deploy Worker
pnpm exec wrangler deploy
```

## Troubleshooting

### "Project not found" error
Create the Pages project first: `wrangler pages project create faircount`

### "binding DB of type d1 must have a valid id" error
Set the `CLOUDFLARE_D1_DATABASE_ID` GitHub secret with your D1 database ID.

### "Authentication error" for R2
Either add R2 permissions to your API token, or comment out the R2 section in `wrangler.toml` if not using storage yet.

### SMTP errors
Verify your SMTP credentials are correct. Test locally first with Mailpit:
```bash
docker compose up -d
# Access Mailpit UI at http://localhost:8025
```
