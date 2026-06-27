FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
WORKDIR /app

FROM base AS builder
# Copy configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate Prisma Client
RUN pnpm --filter api exec prisma generate

# Build the shared library and the NestJS API
RUN pnpm --filter @skil-ex2/shared build
RUN pnpm --filter api build

# Prune devDependencies to reduce image size
RUN rm -rf node_modules && pnpm install --prod --frozen-lockfile

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy the DB CA certificate from the builder stage straight to the system store
# NOTE: It MUST have a .crt extension for update-ca-certificates to recognize it.
COPY --from=builder /app/apps/api/prisma/ca.pem /usr/local/share/ca-certificates/db-ca.crt

# Update the global OS trust store
RUN update-ca-certificates

# Copy node_modules containing production dependencies
COPY --from=builder /app/node_modules ./node_modules
# Copy shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
# Copy API built files and prisma setup
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=builder /app/apps/api/src/generated/prisma ./apps/api/src/generated/prisma
COPY --from=builder /app/apps/api/scripts/start.sh ./apps/api/scripts/start.sh

EXPOSE 8000

# Run entrypoint script
ENTRYPOINT ["sh", "./apps/api/scripts/start.sh"]
