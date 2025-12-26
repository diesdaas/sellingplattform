FROM node:20-slim

# Install OpenSSL for Prisma compatibility
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy shared package first
COPY packages/shared /app/packages/shared

# Install shared package dependencies
WORKDIR /app/packages/shared
RUN npm install --omit=dev

# Create auth service directory
WORKDIR /app/services/auth

# Copy auth service package files
COPY services/auth/package*.json ./

# Update package.json to point to correct shared location
RUN sed -i 's|file:../../packages/shared|file:/app/packages/shared|g' package.json

# Install auth service dependencies
RUN npm install --omit=dev

# Copy Prisma files
COPY services/auth/prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Bundle app source
COPY services/auth/src ./src/

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /sbin/nologin auth

# Change ownership
RUN chown -R auth:nodejs /app
USER auth

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD [ "npm", "start" ]
