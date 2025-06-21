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

# Accept build arguments for user and group IDs
ARG UID=1001
ARG DOCKER_GID=999

# Delete the default 'node' user which often conflicts with host UIDs like 1000.
# This prevents a UID collision during the 'adduser' command.
RUN deluser --remove-home node || echo "node user did not exist"

# Create the docker group first, then the user with the specified UID
RUN addgroup -S -g ${DOCKER_GID} docker
RUN adduser -S -u ${UID} -G docker nextjs

# For debugging, it can be useful to have the docker cli
RUN apk add --no-cache docker-cli

# Copy all application files from the builder stage
COPY --from=app-builder --chown=nextjs:docker /app/public ./public
COPY --from=app-builder --chown=nextjs:docker /app/.next/standalone ./
COPY --from=app-builder --chown=nextjs:docker /app/.next/static ./.next/static

# Ensure the entire /app directory is owned by the correct user.
# This fixes permissions for .next/cache and any other generated files.
RUN chown -R nextjs:docker /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
# By default, Next.js starts on localhost.
# In a Docker container, we need to bind to 0.0.0.0 to accept connections from other containers.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"] 