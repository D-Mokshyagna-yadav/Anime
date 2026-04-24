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

# Prepare Prisma schema/provider and generate client for build-time tasks.
RUN npm run prisma:prepare --workspace=backend && npm run prisma:generate --workspace=backend

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

# Copy package files for production dependency resolution
COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/

# Install only production dependencies for backend
RUN npm ci --workspace=backend --omit=dev --legacy-peer-deps

# Copy pre-generated Prisma client from builder stage
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma ./backend/node_modules/@prisma

# Copy built backend and frontend
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/scripts ./backend/scripts

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

EXPOSE 5000

CMD ["sh", "-c", "node backend/scripts/prepare-prisma-schema.cjs && node backend/dist/index.js"]