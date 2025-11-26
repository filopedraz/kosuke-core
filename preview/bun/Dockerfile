FROM oven/bun:1.3.1-alpine

# Create non-root user with same UID as nextjs image
RUN addgroup -g 1001 -S bun && \
    adduser -S -u 1001 -G bun bun

WORKDIR /app

ENV NODE_ENV=test
ENV NEXT_TELEMETRY_DISABLED=1

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Change ownership of /app to bun user
RUN chown -R bun:bun /app

# Switch to non-root user
USER bun

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0"]
