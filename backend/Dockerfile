# ===== Stage 1: Build =====
FROM node:20-slim AS builder

# Install system dependencies needed for native node packages
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ===== Stage 2: Production Runner =====
FROM node:20-slim AS runner

# Install only runtime dependencies (ffmpeg for media processing)
RUN apt-get update && apt-get install -y ffmpeg --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy only production dependencies and built output
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 5000

CMD ["npm", "run", "start"]
