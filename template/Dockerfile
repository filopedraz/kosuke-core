FROM oven/bun:1.3.1-alpine

# Install required tools: bash, git, postgresql-client
RUN apk add --no-cache bash git postgresql-client openssh-client

WORKDIR /app

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package.json and bun.lock to use mount cache
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy optimized Next.js config for preview environments
# This will override any next.config.ts from the user's project
# COPY next.config.ts /next.config.ts

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
# Use Turbopack for 60% faster compilation
CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0", "--turbopack"]
