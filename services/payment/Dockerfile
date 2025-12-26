FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy Prisma files
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S payment -u 1001

# Change ownership
RUN chown -R payment:nodejs /app
USER payment

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

CMD [ "npm", "start" ]
