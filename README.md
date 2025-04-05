# Kosuke - The First Open-Source Vibe-Coding Platform

Today the first open-source vibe-coding platform, tomorrow the next geneation "IDE" for Web Applications.

## 🚀 Getting Started

### Running Locally

> Make sure to check the Stripe Integration section before running these commands. As of now, you need to provide all the Stripe keys in order to have the commands running smoothly.

```bash
# run postgres and minio
cp .env.example .env
docker compose up -d
# run the database migrations
npm run db:push
# seed the db with a User.
npm run db:seed
```

This will create the following user:

- User: `admin@example.com`
- Password: `admin12345`

You can, of course, create new users as well through `/sign-up`.

For the storage of static files such as profile pictures we are using MinIO. For this reason, after you have the docker-compose up and running, you can visit `http://localhost:9001` with the `.env` credentials and create anew bucket `uploads` which will be used by the web application and make it public.

Finally, run the Next.js development server:

```bash
npm run dev
```

### Docker Preview Setup

For project previews, we use Docker containers to isolate and run Next.js applications. You need to make sure to have docker installed and pull the right image:

```bash
docker pull ghcr.io/filopedraz/kosuke-template:v0.0.5
```

This image will be used for all project previews, providing consistent development environments for your generated applications.

### Stripe Integration

For handling subscriptions, we use Stripe. Add these environment variables to your `.env` file:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

To test webhooks locally, you can use the Stripe CLI to forward events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will provide you with a webhook secret that you can use in your `.env` file.

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

## 🎯 Roadmap (Thinking...)

- [ ] **Database and backend support**: build full-stack web applications, not only static pages.
- [ ] **Brand Guidelines Generator**: include in the pipeline a step related to Font and color palette generation based on the project description.
- [ ] **Templates and blocks**: plug Auth, Billing, Sidebars and other components in matter of words. Battle tested components at your fingerprints.
- [ ] **Ollama Support**: support Ollama as backend for code generation.
- [ ] **Cloud service**: leverage Kosuke [cloud version](https://kosuke.ai) without the need to run this repo locally.

## 🛡️ License

Kosuke is licensed under the [MIT License](https://github.com/filopedraz/kosuke/blob/main/LICENSE).

## 📬 Contact

For questions or support, you can create an issue in the repo or drop me a message at filippo.pedrazzini (at) joandko.io
