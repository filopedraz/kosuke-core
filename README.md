# Kosuke - The first generation IDE for non-technical users

> The project is currently under heavy development, so expect a lot of changes and breaking changes. v2.0.0 is coming soon with a managed private alpha. If you want to be notified when we release, please fill this survey [here](https://dub.sh/vibe-coding-survey).

## 🚀 Getting Started

### Prerequisites

Create environment file and update it with the required secret variables.

```bash
# Setup environment files
cp .env.example .env
```

Ensure you have the following tools installed and configured:

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
- **GitHub OAuth App** - For user authentication and accessing user repositories (import functionality)
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
- **GitHub App** - For Kosuke organization operations (creating repos, pull/push etc.)
  1. Go to your organization settings: `https://github.com/organizations/YOUR-ORG/settings/apps`
  2. Click **New GitHub App**
  3. Configure the app with required permissions:
     - **Repository permissions**: Contents (Read & Write), Administration (Read & Write), Pull requests (Read & Write)
     - **Organization permissions**: Members (Read-only)
  4. Generate a private key (download the `.pem` file)
  5. Install the app on your organization
  6. Get your credentials and add to `.env`:
     - `GITHUB_APP_ID` - Found on your app's settings page
     - `GITHUB_APP_PRIVATE_KEY` - The private key content (format with `\n` for newlines)
     - `GITHUB_APP_INSTALLATION_ID` - From the installation URL
- **Clerk Account** - Authentication provider
  1. Sign up at [clerk.com](https://clerk.com)
  2. Create a new application:
     - Click **Create Application**
     - Enter your application name
     - Under **Sign-in options**, select **Email**, **Google** and **GitHub**
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
  6. **Enable Organizations** in Clerk:
     - Go to **Configure** → **Organizations** in the Clerk dashboard
     - Toggle **Enable organizations**
     - Toggle **Allow personal accounts**
     - Set max organizations per user (recommended: 10)
     - Keep default roles: `org:admin` (owner) and `org:member` (member)
     - **Note**: The app is organization-first - all projects belong to an organization (either personal workspace or team workspace)

### Running Locally

```bash
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

## Adding envionrment variables

- Add the variable in `.env.example`
- If it is a `NEXT_PUBLIC` variable add it in `.env.prod.public`
- If it is a server side variable with non-secret value add it in `.env.prod`
- If it is a server side variable with secret value, add it in `.env.prod` with the syntax `VARIABLE=${VARIABLE}`. Then, add the variable in Github kosuke-core repo using the dedicated Github worflow: Actions > Add secret > Run workflow

## 🎯 Code Style Guidelines

### Go-Style Error Handling

**Use `tryCatch` and `tryCatchSync` from `@/lib/utils/try-catch` to avoid nested try-catch blocks.**

#### **The Problem with Nested Try-Catch**

Nested try-catch blocks lead to:

- Deep indentation and poor readability
- Hidden error flows
- Difficulty tracking which catch handles which error
- Implicit error handling that can be missed

#### **✅ WHEN TO USE tryCatch/tryCatchSync**

- **Nested error handling** - Replace nested try-catch blocks
- **Multiple sequential operations** - Chain operations with explicit error checks
- **Non-fatal errors** - Operations that should continue on error
- **Error recovery** - When you need to handle errors differently per operation
- **Cleaner flow** - Linear code flow instead of nested blocks

#### **❌ WHEN NOT TO USE tryCatch/tryCatchSync**

- **Top-level route handlers** - Keep simple try-catch for API routes
- **Single operation** - No nesting, simple error propagation
- **Need finally blocks** - When cleanup logic is required
- **Performance critical paths** - Minimal overhead, but consider if microseconds matter

#### **🔧 Implementation Patterns**

**✅ CORRECT - Linear flow with tryCatch:**

```typescript
import { tryCatch } from '@/lib/utils/try-catch';

async function processData() {
  try {
    // Check and get source branch data
    const { data: sourceBranch, error: sourceError } = await tryCatch(
      github.rest.repos.getBranch({ owner, repo, branch: 'main' })
    );
    if (sourceError) return ApiErrorHandler.badRequest('Source not found');

    // Check and get target branch data
    const { data: targetBranch, error: targetError } = await tryCatch(
      github.rest.repos.getBranch({ owner, repo, branch: 'develop' })
    );
    if (targetError) return ApiErrorHandler.badRequest('Target not found');

    // Use the data from both operations
    return processSuccess(sourceBranch, targetBranch);
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
```

**❌ WRONG - Nested try-catch:**

```typescript
try {
  try {
    await checkSourceBranch();
  } catch (error) {
    return ApiErrorHandler.badRequest('Source not found');
  }

  try {
    await checkTargetBranch();
  } catch (error) {
    return ApiErrorHandler.badRequest('Target not found');
  }
} catch (error) {
  return handleError(error);
}
```

## 🛡️ License

Kosuke is licensed under the [MIT License](https://github.com/Kosuke-Org/kosuke-core/blob/main/LICENSE).

## 📬 Contact

For questions or support, you can create an issue in the repo or drop me a message at filippo.pedrazzini (at) kosuke.ai
git add
