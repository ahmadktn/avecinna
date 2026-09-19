FROM node:22-bookworm-slim

WORKDIR /app

# Enable corepack and pin pnpm to version 9 (matches pnpm-lock.yaml version 9.0)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Install curl (healthchecks), ca-certificates, and build tools (python3, make, g++ for argon2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml* ./

# Install exact dependencies using matching pnpm 9
RUN pnpm install --frozen-lockfile

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
