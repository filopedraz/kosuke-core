# Kosuke - The first generation IDE for non-technical users

> The project is currently under heavy development, so expect a lot of changes and breaking changes. v2.0.0 is coming soon with a managed version of the project. You can check the v1.0.0 announcement [here](https://www.linkedin.com/feed/update/urn:li:activity:7315297599492624384/).

## 🚀 Getting Started

### Running Locally

```bash
# run the backend
cp .env.example .env
cp ./agent/.env.example ./agent/.env
just run-backend
# run the database migrations
npm run db:push
# run the frontend
npm install
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
