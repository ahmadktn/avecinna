# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Optional build argument for public API base URL during static compilation
ARG NUXT_PUBLIC_API_BASE_URL
ENV NUXT_PUBLIC_API_BASE_URL=${NUXT_PUBLIC_API_BASE_URL}

RUN npm run build

# 2. Production Runner Stage (Minimal Alpine footprint)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy standalone Nitro production server output
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
