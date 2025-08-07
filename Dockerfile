# syntax=docker/dockerfile:1.4
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./

# Use mount cache for npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy only the necessary files for the build
COPY next.config.* .
COPY tsconfig.json .
COPY next-env.d.ts .
COPY tailwind.config.* .
COPY postcss.config.* .
COPY drizzle.config.* .
COPY eslint.config.* .
COPY jest.config.* .
COPY jest.setup.* .
COPY components.json .
COPY middleware.ts .
COPY public ./public
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY hooks ./hooks
COPY scripts ./scripts
COPY .env* ./

# Enable Turbo build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_STANDALONE=true
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV TURBO_REMOTE_ONLY=true

# Use BuildKit cache mount for Next.js
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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
COPY --from=builder --chown=nextjs:nodejs /app/middleware.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["node", "server.js"]
