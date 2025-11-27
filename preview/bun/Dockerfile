FROM oven/bun:1.3.1-slim

# Create non-root user with same UID as kosuke-core image
RUN groupadd -g 1001 bunapp && \
    useradd -u 1001 -g bunapp -m -s /bin/bash bunapp

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 1. Create the directories explicitly
# 2. Change ownership
# This ensures the "mount points" are owned by bunapp (1001), not root.
RUN mkdir -p /app/node_modules /app/.next && \
    chown -R bunapp:bunapp /app

# Switch to non-root user
USER bunapp

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0"]
