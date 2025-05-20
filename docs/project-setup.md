# Project Setup Guide

Welcome to our project! This guide will help you set up the development environment and get started with contributing. Let's go through this step by step.

## Prerequisites

Before you begin, make sure you have the following software installed on your machine:

### Required Software

1. **Node.js** (v20.15.1)

   - Download from [Node.js official website](https://nodejs.org/)
   - Verify installation: `node --version`
   - We recommend using [nvm](https://github.com/nvm-sh/nvm) for Node.js version management

2. **npm** (v10.7.0)

   - Comes with Node.js
   - Verify installation: `npm --version`

3. **Docker Desktop** (v4.7.1)

   - Download from [Docker official website](https://www.docker.com/products/docker-desktop)
   - Required for running PostgreSQL and MinIO services
   - Verify installation: `docker --version`

4. **Stripe CLI**
   - Required for local webhook testing
   - Installation instructions:
     - macOS: `brew install stripe/stripe-cli/stripe`
     - Windows: Download from [Stripe CLI releases](https://github.com/stripe/stripe-cli/releases)
     - Linux: Follow [Stripe CLI installation guide](https://stripe.com/docs/stripe-cli)

## External Services Setup

### 1. Stripe Account Setup

1. Create a Stripe test account:

   - Go to [Stripe Dashboard](https://dashboard.stripe.com/register)
   - Sign up for a test account (no business verification required)
   - Navigate to Developers → API keys
   - Copy your test keys:
     - Publishable key → Set as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - Secret key → Set as `STRIPE_SECRET_KEY`

2. Configure Stripe Webhooks:
   - Open your terminal
   - Run `stripe login` to authenticate
   - Run `stripe listen` to start webhook forwarding
   - Copy the webhook signing secret
   - Set it as `STRIPE_WEBHOOK_SECRET` in your environment variables

### 2. Langfuse Setup

1. Create a Langfuse account:
   - Visit [Langfuse](https://langfuse.com)
   - Sign up and create an organization
   - Create a new project
   - Set up tracing
   - Get your API keys:
     - Secret key → Set as `LANGFUSE_SECRET_KEY`
     - Public key → Set as `LANGFUSE_PUBLIC_KEY`

### 3. Google Gemini API Setup

1. Get API access:
   - Visit [Google AI Studio](https://aistudio.google.com)
   - Create an account or sign in
   - Generate an API key
   - Set it as `GEMINI_API_KEY` in your environment variables

## Project Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
npm install

# Set up pre-commit hooks
npm run prepare
```

### 2. Environment Setup

1. Create a `.env` file in the root directory
2. Copy the contents from `.env.example`
3. Fill in all the required environment variables from the services above

### 3. Start Required Services

```bash
# Start PostgreSQL and MinIO using Docker
docker compose up postgres minio
```

### 4. Database Setup

```bash
# Run database migrations
npm run db:push

# Seed the database with initial data
npm run db:seed
```

### 5. Clone and Configure Template Project

The project requires a template project that contains the base UI components and configurations. Follow these steps:

1. Clone the template project:

   ```bash
   git clone https://github.com/filopedraz/kosuke-template
   ```

2. Set the template directory in your environment:

   - Open your `.env` file
   - Add the following line:
     ```
     TEMPLATE_DIR=/absolute/path/to/kosuke-template
     ```
   - Replace `/absolute/path/to/kosuke-template` with the full path to your cloned template directory
   - Example for macOS/Linux: `/Users/username/projects/kosuke-template`
   - Example for Windows: `C:\Users\username\projects\kosuke-template`

   > 💡 **Tip**: You can get the full path by running `pwd` (macOS/Linux) or `cd` (Windows) in the template directory.

### 6. Start Development Server

```bash
# Start the development server
npm run dev
```

### 7. Access the Application

1. Open your browser and navigate to [http://localhost:3000/sign-in](http://localhost:3000/sign-in)
2. Use the following credentials to log in:
   - Email: `admin@example.com`
   - Password: `admin12345`

## Troubleshooting

### Common Issues

1. **Port Conflicts**

   - If port 3000 is in use, you can change it in the `package.json` scripts
   - If Docker ports are in use, check `docker-compose.yml` for port mappings

2. **Database Connection Issues**

   - Ensure Docker is running
   - Check if PostgreSQL container is up: `docker ps`
   - Verify database credentials in `.env`

3. **Stripe Webhook Issues**

   - Ensure Stripe CLI is running
   - Check webhook secret in `.env`
   - Verify Stripe API keys are correct

4. **Template Project Issues**
   - Verify `TEMPLATE_DIR` is set correctly in `.env`
   - Ensure the template project is cloned and accessible
   - Check file permissions on the template directory

## Need Help?

- Open an issue in the repository
- Join our [community chat](https://discord.gg/b9kD9ghPwW)

Happy coding! 🚀
