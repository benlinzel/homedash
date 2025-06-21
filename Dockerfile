# 1. Base Stage: Setup Node.js and pnpm via Corepack
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 2. Deps Stage: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Fetches all dependencies into a content-addressable store
RUN pnpm fetch
# Installs dependencies from the store
RUN pnpm install --frozen-lockfile --offline

# 3. Builder Stage: Build the Next.js application
FROM base AS app-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 4. Runner Stage: Create the final production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

# Add a build argument for the Docker GID.
# This allows us to match the host's Docker group ID for socket permissions.
ARG DOCKER_GID=999

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create a docker group with the GID passed in at build time
# and add the nextjs user to it. If the GID is already in use,
# just add the nextjs user to the existing group.
RUN if ! getent group ${DOCKER_GID}; then addgroup --gid ${DOCKER_GID} docker; fi && addgroup nextjs $(getent group ${DOCKER_GID} | cut -d: -f1)

# For debugging, it can be useful to have the docker cli
RUN apk add --no-cache docker-cli

COPY --from=app-builder --chown=nextjs:nodejs /app/public ./public
# Copy standalone output
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=app-builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# By default, Next.js starts on localhost.
# In a Docker container, we need to bind to 0.0.0.0 to accept connections from other containers.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"] 