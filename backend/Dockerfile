# Build stage
FROM node:20-alpine AS build

WORKDIR /app

RUN npm install -g npm@11.15.0

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g npm@11.15.0

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built output
COPY --from=build /app/dist ./dist

# Copy init SQL for DB migration
COPY init-db.sql ./init-db.sql

EXPOSE 3000

# OpenShift runs as non-root (UID 1001)
RUN chown -R 1001:0 /app
USER 1001

CMD ["node", "dist/server.js"]
