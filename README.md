# FairCount

Split shared expenses fairly, based on each person's income.

FairCount is a Progressive Web App (PWA) that simplifies expense sharing between friends, roommates, or colleagues. Its key feature: splitting costs proportionally to each participant's income for real financial fairness.

## Features

- **Fair splitting** – Automatically adjust shares based on each member's income
- **Collaborative groups** – Create groups and invite participants via shareable links
- **Detailed tracking** – View complete history of expenses and reimbursements
- **Smart settlements** – Optimized payment suggestions to simplify who owes whom
- **Progressive Web App** – Install on your phone, use offline
- **Secure authentication** – Passwordless magic links via email

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Cloudflare Workers, Hono
- **Database**: Cloudflare D1 (SQLite), Drizzle ORM
- **Authentication**: better-auth (magic links)
- **Deployment**: Cloudflare Pages

## Installation

### Prerequisites

- Node.js 18+
- pnpm

### Local Setup

```bash
# Clone the repository
git clone https://github.com/sylvainDNS/faircount.git
cd faircount

# Install dependencies
pnpm install

# Configure environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add AUTH_SECRET and SMTP_* settings

# Run database migrations
pnpm db:migrate
```

### Start Development Servers

You need two terminals: one for the frontend, one for the worker.

```bash
# Terminal 1: Frontend (Vite, port 3000)
pnpm dev

# Terminal 2: Worker (Cloudflare, port 8787)
pnpm worker:dev
```

Access the app at http://localhost:3000

## Main Commands

```bash
pnpm check          # Lint + auto-format
pnpm build          # Production build
pnpm worker:deploy  # Deploy to Cloudflare
pnpm db:studio      # Open Drizzle Studio for data management
```

## Contributing

Contributions are welcome! Feel free to open issues or pull requests.

## License

MIT
