FROM oven/bun:1.3.1-alpine

# The base image already has a 'bun' user, so we create a different user
# Create non-root user with same UID as nextjs image
RUN addgroup -g 1001 -S bunapp && \
    adduser -S -u 1001 -G bunapp bunapp

WORKDIR /app

ENV NODE_ENV=test
ENV NEXT_TELEMETRY_DISABLED=1

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Change ownership of /app to bunapp user
RUN chown -R bunapp:bunapp /app

# Switch to non-root user
USER bunapp

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0"]
