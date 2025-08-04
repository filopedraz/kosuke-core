# Kosuke - The First Open-Source Vibe-Coding Platform

> The project is currently under heavy development, so expect a lot of changes and breaking changes. v2.0.0 is coming soon with a managed version of the project.

## 🚀 Getting Started

### Running Locally

```bash
# run postgres and minio
cp .env.example .env
just run-backend
# run the database migrations
npm run db:push
# seed the db with a User.
npm run db:seed
```

This will create the following user:

- User: `admin@example.com`
- Password: `admin12345`

You can, of course, create new users as well through `/sign-up`.

For the storage of static files such as profile pictures we are using MinIO. For this reason, after you have the docker-compose up and running, you can visit `http://localhost:9001` with the `.env` credentials and create a new bucket `uploads` which will be used by the web application and make it public.

Finally, run the Next.js development server:

```bash
npm run dev
```

### Docker Preview Setup

For project previews, we use Docker containers to isolate and run Next.js applications. You need to make sure to have docker installed and pull the right image:

```bash
docker pull ghcr.io/filopedraz/kosuke-template:v0.0.75
```

This image will be used for all project previews, providing consistent development environments for your generated applications.

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
