FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy all package files first
COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Copy full source code before npm ci (needed for workspaces to resolve)
COPY . .

# Install all dependencies for root, backend, and frontend workspaces
RUN npm ci

# Install native bindings explicitly
RUN npm install --workspace=frontend --no-save @rolldown/binding-linux-x64-gnu@1.0.0-rc.16 lightningcss-linux-x64-gnu@1.32.0

# Reinstall rolldown and vite to ensure they find the native bindings
RUN npm install --workspace=frontend --force rolldown@latest vite

# Build the project (backend and frontend)
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS production

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

EXPOSE 5000

CMD ["node", "backend/dist/index.js"]