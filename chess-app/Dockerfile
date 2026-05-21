# Build stage
FROM node:20-alpine AS build

WORKDIR /app

RUN npm install -g npm@11.15.0

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config and entrypoint script
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /docker-entrypoint.d/99-custom.sh
RUN chmod +x /docker-entrypoint.d/99-custom.sh

EXPOSE 80

CMD ["/docker-entrypoint.d/99-custom.sh"]
