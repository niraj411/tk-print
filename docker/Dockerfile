# Single stage build for simplicity
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/dashboard/package.json ./packages/dashboard/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm --filter api db:generate

# Build API
RUN pnpm --filter api build

# Build dashboard
RUN pnpm --filter dashboard build

# Move dashboard build to API public folder
RUN cp -r packages/dashboard/dist packages/api/public

# Create data directory
RUN mkdir -p /app/packages/api/data

# Set environment
ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/tk-print.db

WORKDIR /app/packages/api

EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "pnpm exec prisma db push && node dist/index.js"]
