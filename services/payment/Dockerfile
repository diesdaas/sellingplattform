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

# Create payment service directory
WORKDIR /app/services/payment

# Copy payment service package files
COPY services/payment/package*.json ./

# Update package.json to point to correct shared location
RUN sed -i 's|file:../../packages/shared|file:/app/packages/shared|g' package.json

# Install payment service dependencies
RUN npm install --omit=dev

# Copy Prisma files
COPY services/payment/prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Bundle app source
COPY services/payment/src ./src/

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /sbin/nologin payment

# Change ownership
RUN chown -R payment:nodejs /app
USER payment

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

CMD [ "npm", "start" ]
