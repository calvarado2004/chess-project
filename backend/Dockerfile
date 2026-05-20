# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built output
COPY --from=build /app/dist ./dist

# Copy init SQL for DB migration
COPY init-db.sql ./init-db.sql

EXPOSE 3000

CMD ["node", "dist/server.js"]
