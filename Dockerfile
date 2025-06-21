# 1. Base Stage: Use a specific Node.js version on Alpine Linux
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

# 2. Dependencies Stage: Install all dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 3. Builder Stage: Build the Next.js application and prune dev dependencies
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
RUN pnpm prune --prod

# 4. Runner Stage: Create the final, lean production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

# Accept build arguments for user and group IDs, matching the host
ARG UID=1001
ARG DOCKER_GID=999

# Create a user and group with matching IDs, after removing any potential conflicts.
# Also, install the docker-cli which is needed for event listening and commands.
RUN deluser --remove-home node || echo "node user did not exist" && \
    addgroup -S -g ${DOCKER_GID} docker && \
    adduser -S -u ${UID} -G docker nextjs && \
    apk add --no-cache docker-cli

# Copy only the necessary production-ready files from the builder stage.
# This includes the pruned node_modules, the standalone server, and static assets.
COPY --from=builder --chown=nextjs:docker /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:docker /app/public ./public
COPY --from=builder --chown=nextjs:docker /app/.next/standalone ./
COPY --from=builder --chown=nextjs:docker /app/.next/static ./.next/static

# The application will run as this non-root user.
USER nextjs

EXPOSE 3000

ENV PORT=3000
# By default, Next.js starts on localhost.
# In a Docker container, we need to bind to 0.0.0.0 to accept connections from other containers.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"] 