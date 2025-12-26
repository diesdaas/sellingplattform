FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma files
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S auth -u 1001

# Change ownership
RUN chown -R auth:nodejs /app
USER auth

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD [ "npm", "start" ]
