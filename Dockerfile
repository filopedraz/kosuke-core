# syntax=docker/dockerfile:1.4
FROM node:22.20.0-slim AS base

RUN npm install -g bun@latest

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_STANDALONE=true
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json bun.lock ./

# Use mount cache for Bun
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock

# Copy only the necessary files for the build
COPY next.config.* .
COPY sentry*.config.* .
COPY instrumentation*.ts .
COPY tsconfig.json .
COPY tailwind.config.* .
COPY postcss.config.* .
COPY drizzle.config.* .
COPY eslint.config.* .
COPY jest.config.* .
COPY jest.setup.* .
COPY components.json .
COPY public ./public
COPY src ./src
COPY .env* ./


# Use BuildKit cache mount for Next.js
RUN --mount=type=cache,target=/app/.next/cache \
    bun run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN \
    groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    mkdir .next && \
    chown nextjs:nodejs .next

# Copy only the necessary files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.env* ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.* ./
COPY --from=builder --chown=nextjs:nodejs /app/src/middleware.ts ./middleware.ts
COPY --from=builder --chown=nextjs:nodejs /app/sentry*.config.* ./
COPY --from=builder --chown=nextjs:nodejs /app/instrumentation*.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/src/lib ./lib

USER nextjs

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["node", "server.js"]
