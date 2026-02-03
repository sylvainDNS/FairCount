# Deployment Guide

## Quick Reference: Where to Configure What

| What | Where | When used |
|------|-------|-----------|
| `CLOUDFLARE_API_TOKEN` | GitHub Secrets | Deploy time |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets | Deploy time |
| `CLOUDFLARE_D1_DATABASE_ID` | GitHub Secrets | Deploy time |
| `APP_URL` | GitHub Variables | Deploy time (injected into Worker) |
| `API_URL` | GitHub Variables | Build time (frontend) |
| `AUTH_SECRET` | Cloudflare Secrets | Runtime (Worker) |
| `SMTP_*` | Cloudflare Secrets | Runtime (Worker) |

## Step-by-Step Setup

### 1. Create Cloudflare Resources

```bash
# D1 Database
pnpm exec wrangler d1 create faircount-db
# → Save the database_id

# Pages Project
pnpm exec wrangler pages project create faircount
```

### 2. Configure GitHub (Settings → Secrets and variables → Actions)

#### Secrets (sensitive)

| Name | Value |
|------|-------|
| `CLOUDFLARE_API_TOKEN` | [Create token](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Dashboard → Overview → Account ID |
| `CLOUDFLARE_D1_DATABASE_ID` | UUID from step 1 |

#### Variables (non-sensitive)

| Name | Value | Description |
|------|-------|-------------|
| `APP_URL` | `https://faircount.sylvaindenyse.me` | Frontend URL (for CORS) |
| `API_URL` | `https://api.faircount.sylvaindenyse.me` | API URL (for frontend) |

### 3. Configure Cloudflare Worker Secrets

These are runtime secrets used by the Worker. Run these commands:

```bash
pnpm exec wrangler secret put AUTH_SECRET
# → Paste output of: openssl rand -base64 32

pnpm exec wrangler secret put SMTP_HOST
# → e.g., smtp.protonmail.ch

pnpm exec wrangler secret put SMTP_PORT
# → e.g., 587

pnpm exec wrangler secret put SMTP_USER
# → e.g., noreply@faircount.app

pnpm exec wrangler secret put SMTP_PASS
# → Your SMTP password

pnpm exec wrangler secret put SMTP_FROM
# → e.g., noreply@faircount.app
```

### 4. Deploy

Push to `main` to trigger deployment:

```bash
git push origin main
```

## Local Development

For local development, you only need `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your local values
```

The `wrangler.toml` already has local defaults (`APP_URL = http://localhost:3000`).

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                         │
├─────────────────────────────────────────────────────────────┤
│  wrangler.toml     → APP_URL, APP_NAME (localhost values)   │
│  .dev.vars         → AUTH_SECRET, SMTP_* (local secrets)    │
│  pnpm dev          → Frontend on :3000                      │
│  pnpm worker:dev   → Worker on :8787                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION                              │
├─────────────────────────────────────────────────────────────┤
│  GitHub Secrets    → CLOUDFLARE_* (deploy credentials)      │
│  GitHub Variables  → APP_URL, API_URL (injected at deploy)  │
│  Cloudflare Secrets→ AUTH_SECRET, SMTP_* (runtime secrets)  │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### "Project not found" error
Create the Pages project: `wrangler pages project create faircount`

### "binding DB must have a valid id" error
Add `CLOUDFLARE_D1_DATABASE_ID` to GitHub Secrets.

### Frontend calls localhost:8787 in production
Add `API_URL` to GitHub Variables (not Secrets).

### CORS errors
Check `APP_URL` in GitHub Variables matches your frontend domain exactly.

### Authentication/magic link emails not sent
Verify Cloudflare Worker secrets are set: `wrangler secret list`
