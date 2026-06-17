# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace config
COPY package.json package-lock.json ./

# Copy app code
COPY apps/BESS-frontend/package.json ./apps/BESS-frontend/

# Copy react-common package first (dependency)
COPY packages/react-common/package.json ./packages/react-common/

# install everything it will also install it in all the workspaces
RUN npm install

# Copy app code
COPY apps/BESS-frontend/ ./apps/BESS-frontend/

COPY packages/react-common/ ./packages/react-common/

# Go to apps BESS-frontend and build
WORKDIR /app/apps/BESS-frontend

RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built assets from builder
COPY --from=builder /app/apps/BESS-frontend/dist ./dist

# Expose port
EXPOSE 3020

# Serve the build with SPA fallback
CMD ["serve", "-s", "dist", "-l", "3020"]
