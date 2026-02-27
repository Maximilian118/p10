# Stage 1: Build the TypeScript backend.
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install all dependencies (including devDependencies for tsc).
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and compile TypeScript.
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production image with only runtime dependencies.
FROM node:20-slim AS production

WORKDIR /app

# Copy package files and install production-only dependencies.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled JavaScript from builder stage.
COPY --from=builder /app/dist ./dist

# Railway injects PORT automatically. Default to 3001 for local testing.
ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3001

CMD ["node", "dist/app.js"]
