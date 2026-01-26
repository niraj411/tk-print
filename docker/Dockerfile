# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/api/package.json ./packages/api/
COPY packages/dashboard/package.json ./packages/dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm --filter api db:generate

# Build API
RUN pnpm --filter api build

# Build dashboard
RUN pnpm --filter dashboard build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/

# Install production dependencies only
RUN pnpm install --filter api --prod --frozen-lockfile

# Copy built API
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/

# Copy built dashboard to serve as static files
COPY --from=builder /app/packages/dashboard/dist ./packages/api/public

# Create data directory for SQLite
RUN mkdir -p /app/packages/api/data && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment
ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/tk-print.db

WORKDIR /app/packages/api

EXPOSE 3000

# Run database migrations and start server
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
