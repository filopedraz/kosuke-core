# Kosuke - The first generation IDE for non-technical users

> The project is currently under heavy development, so expect a lot of changes and breaking changes. v2.0.0 is coming soon with a managed private alpha. If you want to be notified when we release, please fill this survey [here](https://dub.sh/vibe-coding-survey).

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following tools installed and configured:

- **bun** - Package manager
  - Install via curl: `curl -fsSL https://bun.com/install | bash`
  - Install specific version (check `.bun-version` file): `curl -fsSL https://bun.com/install | bash -s "bun-v1.3.1"`
  - For other installation methods see [Bun installation](https://bun.com/docs/installation)
- **Docker Desktop or OrbStack** - Required for running PostgreSQL and Nextjs locally
  - [Docker Desktop](https://www.docker.com/products/docker-desktop) - Traditional Docker solution
  - [OrbStack](https://orbstack.dev/) - Lightweight, faster alternative for macOS (Recommended)
- **just** - Command runner for project tasks
  - Install via Homebrew: `brew install just`
  - Or see [alternative installation methods](https://github.com/casey/just#installation)
- **nvm (Node Version Manager)** - Optional, only needed if running linting/tests locally
  - Install from [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm)
  - The project includes a `.nvmrc` file to automatically use Node.js 22.20.0
- **GitHub OAuth App** - For authentication and repository access
  1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
  2. Click **OAuth Apps** → **New OAuth App**
  3. Fill in the application details:
     - **Application name**: `Kosuke Core Local` (or your preferred name)
     - **Homepage URL**: `http://localhost:3000`
     - **Authorization callback URL**: `https://YOUR_CLERK_DOMAIN/v1/oauth_callback` (you'll get this from Clerk in the next step)
  4. Click **Register application**
  5. Copy the **Client ID** (you'll need this for Clerk setup)
  6. Click **Generate a new client secret** and copy it immediately (you'll need this for Clerk setup)
  7. Keep this tab open - you'll configure the callback URL after setting up Clerk
- **Clerk Account** - Authentication provider
  1. Sign up at [clerk.com](https://clerk.com)
  2. Create a new application with **GitHub as the only login method**:
     - Click **Create Application**
     - Enter your application name
     - Under **Sign-in options**, select only **GitHub**
     - Click **Create Application**
  3. Configure **GitHub OAuth** in Clerk:
     - In your Clerk dashboard, go to **Configure** → **SSO Connections**
     - Click on **GitHub**
     - Toggle **Use custom credentials**
     - Enter your **GitHub Client ID** (from step 5 of GitHub OAuth App setup)
     - Enter your **GitHub Client Secret** (from step 6 of GitHub OAuth App setup)
     - Copy the **Authorized redirect URI** shown (e.g., `https://your-app.clerk.accounts.dev/v1/oauth_callback`)
     - Save the settings
  4. Update **GitHub OAuth App callback URL**:
     - Go back to your GitHub OAuth App settings
     - Update the **Authorization callback URL** with the redirect URI from Clerk
     - Click **Update application**
  5. Get Clerk **API Keys**:
     - Navigate to **API Keys** in the Clerk dashboard
     - Copy the following keys to your `.env` file:
       - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Found under "Publishable key"
       - `CLERK_SECRET_KEY` - Found under "Secret keys"
  6. Configure **Webhook** endpoint (requires ngrok for local development):
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
# Setup environment files
cp .env.example .env

# Start all services (Postgres + Next.js)
just run
```

The application will be available at:

- Next.js app: http://localhost:3000
- Postgres: localhost:54323

For pre-commits and IDE linting install the dependencies locally:

```bash
just install
```

**Note**: On first run, you may need to run database migrations. Open a new terminal and run:

```bash
# Run database migrations inside the Next.js container
just migrate
```

## 🛡️ License

Kosuke is licensed under the [MIT License](https://github.com/filopedraz/kosuke/blob/main/LICENSE).

## 📬 Contact

For questions or support, you can create an issue in the repo or drop me a message at filippo.pedrazzini (at) kosuke.ai
