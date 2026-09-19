# 1. Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack and pin pnpm to version 9 (matches pnpm-lock.yaml version 9.0)
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

COPY . .

# Optional build argument for public API base URL during static compilation
ARG NUXT_PUBLIC_API_BASE_URL
ENV NUXT_PUBLIC_API_BASE_URL=${NUXT_PUBLIC_API_BASE_URL}

RUN pnpm run build

# 2. Production Runner Stage (Minimal Alpine footprint on Node 22)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy standalone Nitro production server output
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
