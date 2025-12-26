FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /

# Copy shared package to root level (so file:../packages/shared resolves correctly)
COPY packages/shared ./packages/shared

# Install shared package dependencies
WORKDIR /packages/shared
RUN npm install

WORKDIR /app

# Copy backend directory structure
COPY gocart-backend/package*.json ./
COPY gocart-backend/prisma ./prisma
COPY gocart-backend/config ./config
COPY gocart-backend/server.js ./
COPY gocart-backend/.env* ./

# Create src directory (will be volume mounted in dev)
RUN mkdir -p src

# Update package.json to point to correct shared location
RUN sed -i 's|file:../packages/shared|file:/packages/shared|g' package.json

# Install dependencies
RUN npm install

# Generate prisma client
RUN npx prisma generate

# Source code will be mounted via volume in docker-compose for development

# Expose port
EXPOSE 5000

# Start development server with nodemon
CMD ["npm", "run", "dev"]

