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

# Install all dependencies for root, backend, and frontend workspaces (including devDependencies)
RUN npm ci

# Install all native bindings explicitly
RUN npm install --workspace=frontend --no-save \
    @rolldown/binding-linux-x64-gnu@1.0.0-rc.16 \
    lightningcss-linux-x64-gnu@1.32.0 \
    @tailwindcss/oxide-linux-x64-gnu

# Rebuild native modules to ensure they're properly linked
RUN npm rebuild --workspace=frontend

# Build the project (backend and frontend)
RUN npm run build

FROM node:20-bookworm-slim AS production

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5000

# Copy all node_modules (dotenv is needed at runtime)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

EXPOSE 5000

CMD ["node", "backend/dist/index.js"]