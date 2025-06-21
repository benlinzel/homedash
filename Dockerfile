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

# Accept a build argument for the Docker GID
ARG DOCKER_GID=999

# Create a docker group with the specified GID and a non-root user
RUN addgroup -S -g ${DOCKER_GID} docker
RUN adduser -S -u 1001 -G docker nextjs

# For debugging, it can be useful to have the docker cli
RUN apk add --no-cache docker-cli

# Copy all application files from the builder stage
COPY --from=app-builder --chown=nextjs:docker /app/public ./public
COPY --from=app-builder --chown=nextjs:docker /app/.next/standalone ./
COPY --from=app-builder --chown=nextjs:docker /app/.next/static ./.next/static

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Now that the entrypoint can run as root, we switch to the non-root user
# for the main application process for better security.
USER nextjs

EXPOSE 3000

ENV PORT=3000
# By default, Next.js starts on localhost.
# In a Docker container, we need to bind to 0.0.0.0 to accept connections from other containers.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"] 