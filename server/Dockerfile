FROM node:20-slim AS builder

# Install git and build tools for native modules (hnswlib-node needs node-gyp)
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies with legacy peer deps to avoid conflicts
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-slim

# Install git, build tools and Chrome dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for WhatsApp session
RUN mkdir -p /app/data/whatsapp_auth

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
