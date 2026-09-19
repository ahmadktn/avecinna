FROM node:20-bookworm-slim

WORKDIR /app

# Install curl for container healthchecks and CA certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install all dependencies (tsx & drizzle-kit needed for startup schema push)
RUN npm install

COPY . .

# Ensure entrypoint script is executable
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npx", "tsx", "src/app.ts"]
