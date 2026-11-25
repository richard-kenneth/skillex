FROM node:26-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
# Install pnpm directly instead of through corepack. Corepack downloads the
# pinned package manager from the npm registry on first use, and a failed
# download or signature check aborts the image build with exit code 1 and no
# pnpm output. npm retries transient failures and reports them clearly.
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
RUN npm install --global pnpm@12.23.0
# Keep the pnpm store inside the cached mount so dependency downloads survive
# between builds.
ENV npm_config_store_dir=/pnpm/store
WORKDIR /app

FROM base AS builder
# Copy configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
# `apps/api` runs `prisma generate` in its postinstall script, so the Prisma
# schema and config must exist before dependencies are installed. Without them
# the install aborts with exit code 1.
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY apps/mobile/modules/audio-device-detector ./apps/mobile/modules/audio-device-detector

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate Prisma Client
RUN pnpm --filter api exec prisma generate

# Build the shared library and the NestJS API
RUN pnpm --filter @skillex/shared build
RUN pnpm --filter api build

# Prune devDependencies to reduce image size
RUN rm -rf node_modules && pnpm install --prod --frozen-lockfile

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy node_modules containing production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Explicitly place the built shared package into node_modules for hoisted resolution
RUN mkdir -p ./node_modules/@skillex/shared
COPY --from=builder /app/packages/shared/dist ./node_modules/@skillex/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@skillex/shared/package.json

# Copy API built files and prisma setup
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=builder /app/apps/api/src/generated/prisma ./apps/api/src/generated/prisma
COPY --from=builder /app/apps/api/scripts/start.sh ./apps/api/scripts/start.sh

EXPOSE 3001

# Run entrypoint script
ENTRYPOINT ["sh", "./apps/api/scripts/start.sh"]
