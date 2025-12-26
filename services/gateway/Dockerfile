FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy shared package first
COPY packages/shared /app/packages/shared

# Install shared package dependencies
WORKDIR /app/packages/shared
RUN npm install --omit=dev

# Create gateway service directory
WORKDIR /app/services/gateway

# Copy gateway service package files
COPY services/gateway/package*.json ./

# Update package.json to point to correct shared location
RUN sed -i 's|file:../../packages/shared|file:/app/packages/shared|g' package.json

# Install gateway service dependencies
RUN npm install --omit=dev

# Bundle app source
COPY services/gateway/src ./src/

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /sbin/nologin gateway

# Change ownership
RUN chown -R gateway:nodejs /app
USER gateway

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD [ "npm", "start" ]
