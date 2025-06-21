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

# Accept build arguments for user and docker group IDs
ARG UID=1001
ARG DOCKER_GID=999

# 1. Install all necessary packages first
RUN apk add --no-cache docker-cli sudo

# 2. Create the docker group and the nextjs user
RUN addgroup -g ${DOCKER_GID} -S docker
RUN adduser -u ${UID} -G docker -D -s /bin/sh nextjs

# 3. Grant passwordless sudo to the nextjs user inside the container
RUN echo "nextjs ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/nextjs

# 4. Copy all application files from the builder stage
COPY --from=app-builder /app/public ./public
COPY --from=app-builder /app/.next/standalone ./
COPY --from=app-builder /app/.next/static ./.next/static

# 5. Set correct ownership for the entire application directory
RUN chown -R nextjs:docker /app

# 6. Switch to the non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
# By default, Next.js starts on localhost.
# In a Docker container, we need to bind to 0.0.0.0 to accept connections from other containers.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"] 