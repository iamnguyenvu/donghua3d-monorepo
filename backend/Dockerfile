FROM node:20-slim

# Install system dependencies needed for native node packages or ffmpeg
RUN apt-get update && apt-get install -y ffmpeg python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm ci

# Copy database schema first for client generation
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]
