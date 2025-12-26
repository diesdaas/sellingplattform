# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Run the Next.js application
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment variables
ENV NODE_ENV production
ENV HOST 0.0.0.0
ENV PORT 3000

# Copy necessary files from builder stage
# Only copy public directory if it exists (for Next.js apps without public assets)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]






