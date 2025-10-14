# Kosuke - The first generation IDE for non-technical users

> The project is currently under heavy development, so expect a lot of changes and breaking changes. v2.0.0 is coming soon with a managed private alpha. If you want to be notified when we release, please fill this survey [here](https://cooperative-somersault-9ef.notion.site/25aca60065ee80388e90dc22815b1713?pvs=105).

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following tools installed and configured:

- **nvm (Node Version Manager)** - Manages Node.js versions
  - Install from [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm)
  - The project includes a `.nvmrc` file to automatically use Node.js 22.20.0
- **npm** - Package manager (included with Node.js)
- **Docker Desktop or OrbStack** - Required for running PostgreSQL database locally
  - [Docker Desktop](https://www.docker.com/products/docker-desktop) - Traditional Docker solution
  - [OrbStack](https://orbstack.dev/) - Lightweight, faster alternative for macOS
- **just** - Command runner for project tasks
  - Install via Homebrew: `brew install just`
  - Or see [alternative installation methods](https://github.com/casey/just#installation)
- **Clerk Account** - Authentication provider
  1. Sign up at [clerk.com](https://clerk.com)
  2. Create a new application
  3. Navigate to **API Keys** in the dashboard
  4. Copy the following keys to your `.env` file:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Found under "Publishable key"
     - `CLERK_SECRET_KEY` - Found under "Secret keys"
  5. Configure your **Webhook** endpoint (requires ngrok for local development):
     - Install ngrok: `brew install ngrok` or download from [ngrok.com](https://ngrok.com)
     - Sign up for a free ngrok account and get your auth token
     - Authenticate ngrok: `ngrok config add-authtoken YOUR_TOKEN`
     - Claim a free static domain in the [ngrok dashboard](https://dashboard.ngrok.com/domains)
     - In a new terminal, run: `ngrok http 3000 --domain=YOUR_STATIC_DOMAIN.ngrok-free.app`
     - Copy your static domain URL (e.g., `https://your-domain.ngrok-free.app`)
     - Go to **Webhooks** in the Clerk dashboard
     - Add endpoint: `https://YOUR_STATIC_DOMAIN.ngrok-free.app/api/webhooks/clerk`
     - Subscribe to events: `user.created`, `user.updated`, `user.deleted`
     - Copy the **Signing Secret** to `CLERK_WEBHOOK_SECRET` in your `.env` file
     - **Note**: Keep ngrok running while developing to receive webhook events

### Running Locally

```bash
# run the backend
cp .env.example .env
cp ./agent/.env.example ./agent/.env
just run-backend
# install Next.js dependencies
nvm i && npm ci
# run the database migrations
npm run db:push
# run the Next.js application
npm run dev
```

### Linting and Pre-commit Hook

To set up the linting pre-commit hook:

```bash
npm install
npm run prepare
```

This configures a Git pre-commit hook that runs linting and prevents commits with issues. To bypass in exceptional cases:

```bash
git commit -m "Your message" --no-verify
```

## 🛡️ License

Kosuke is licensed under the [MIT License](https://github.com/filopedraz/kosuke/blob/main/LICENSE).

## 📬 Contact

For questions or support, you can create an issue in the repo or drop me a message at filippo.pedrazzini (at) joandko.io
