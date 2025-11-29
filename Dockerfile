# ========================================
# PlayOff - Music Voting Application
# Docker Configuration
# ========================================
# 
# Note: Run 'docker scan' periodically to check for vulnerabilities
# Update base image version as new patches are released
#
# ========================================

# Use Node.js 20 LTS Alpine (slim and secure)
# Pin to specific version for reproducibility
FROM node:20.18-alpine3.20 AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
# Add libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Development image
FROM base AS development
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Expose ports (Vite dev server + Express API)
EXPOSE 5175 3000

# Environment variables
ENV NODE_ENV=development
ENV VITE_API_URL=http://localhost:3000

# Start both servers with concurrently
CMD ["npm", "run", "dev"]

# Production build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Vite application
RUN npm run build

# Production image
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 playoff

# Copy built assets and server files
COPY --from=builder --chown=playoff:nodejs /app/dist ./dist
COPY --from=builder --chown=playoff:nodejs /app/server.js ./
COPY --from=builder --chown=playoff:nodejs /app/package.json ./
COPY --from=builder --chown=playoff:nodejs /app/public ./public
COPY --from=builder --chown=playoff:nodejs /app/routes ./routes
COPY --from=builder --chown=playoff:nodejs /app/auth ./auth
COPY --from=deps --chown=playoff:nodejs /app/node_modules ./node_modules

USER playoff

# Expose production port
EXPOSE 3000

# Start the production server
CMD ["node", "server.js"]
