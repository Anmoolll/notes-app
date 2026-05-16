# ---- Build stage ----
    FROM node:20-alpine AS builder

    WORKDIR /app
    
    COPY package*.json ./
    RUN npm ci
    
    COPY tsconfig.json ./
    COPY src ./src
    
    RUN npm run build
    
    # ---- Production stage ----
    FROM node:20-alpine AS runner
    
    WORKDIR /app
    
    # Only copy what's needed to run
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    COPY --from=builder /app/dist ./dist
    
    # Non-root user for security
    RUN addgroup -S appgroup && adduser -S appuser -G appgroup
    USER appuser
    
    EXPOSE 3000
    
    CMD ["node", "dist/index.js"]