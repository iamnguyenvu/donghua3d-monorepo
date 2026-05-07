# Claude Spec-Driven Development: 05_ops_spec

This document serves as the **Ops & Infrastructure Specification (05_ops_spec)** for **Donghua3D**. It specifies the Docker container layouts, Nginx reverse proxy microcaching, storage providers, and progressive scaling math.

---

## 1. Multi-Stage Docker Container Configurations

To ensure minimum image footprint and maximum security, we use multi-stage builds with Alpine Linux-based Node images.

### 1.1 Backend Docker Container (Prisma + FFmpeg)
```dockerfile
# Stage 1: Build source code
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate
COPY src ./src/
RUN npm run build

# Stage 2: Minimal Production image
FROM node:20-alpine
WORKDIR /app
# Install FFmpeg and basic utilities
RUN apk add --no-cache ffmpeg
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY prisma ./prisma/
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
# Expose default uploads mount path
RUN mkdir -p /app/uploads/temp /app/uploads/hls /app/uploads/thumbnails
VOLUME /app/uploads
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

### 1.2 Frontend Docker Container (Next.js Standalone Build)
```dockerfile
# Stage 1: Dependency installation & compilation
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Minimal runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy essential runtime files (utilizing Next.js standalone folder output)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

---

## 2. High-Performance Nginx Caching & CORS

To minimize database queries and allow high-speed static video delivery directly from the EC2 local storage volume:

```nginx
user nginx;
worker_processes auto;

error_log /var/log/nginx/error.log notice;
pid       /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    types_hash_max_size 2048;

    # Gzip Compression for JSON APIs and pages (not video files)
    gzip on;
    gzip_disable "msie6";
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Configure disk cache space for microcaching APIs
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=10m use_temp_path=off;

    server {
        listen 80;
        server_name localhost;

        # Frontend web requests
        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API requests (with microcaching on public lists)
        location /api {
            proxy_pass http://backend:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            client_max_body_size 500M; -- allows large video uploads
        }

        # Microcache public tier list leaderboard
        location /api/tier-list/global {
            proxy_pass http://backend:5000;
            proxy_cache api_cache;
            proxy_cache_valid 200 5s; -- microcache for 5s
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            add_header X-Cache-Status $upstream_cache_status;
        }

        # High-Performance static file serving (HLS Video & Thumbnails)
        # Serves HLS segments directly bypassing node processes
        location /static/ {
            alias /usr/share/nginx/html/uploads/;
            
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Range,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type' always;

            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*';
                add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
                add_header 'Access-Control-Allow-Headers' 'Range,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type';
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain charset=UTF-8';
                add_header 'Content-Length' 0;
                return 204;
            }

            # Playlists (.m3u8) should NOT be cached, enabling instant additions/removals
            location ~* \.m3u8$ {
                add_header Cache-Control "no-cache, no-store, must-revalidate" always;
                add_header 'Access-Control-Allow-Origin' '*' always;
            }

            # Video chunks (.ts) are immutable and must be cached heavily
            location ~* \.ts$ {
                expires 30d;
                add_header Cache-Control "public, max-age=2592000, immutable" always;
                add_header 'Access-Control-Allow-Origin' '*' always;
            }

            # Image thumbnails cache profile
            location ~* \.(jpg|jpeg|png|webp|gif)$ {
                expires 7d;
                add_header Cache-Control "public, max-age=604800" always;
                add_header 'Access-Control-Allow-Origin' '*' always;
            }
        }
    }
}
```

---

## 3. Storage Providers Setup (S3 + CloudFront Integration)

When `STORAGE_PROVIDER=S3` is set, the application automatically handles video segment uploads to S3. To prevent hotlinking, we utilize AWS **CloudFront** with **Origin Access Control (OAC)**:

1. **Private S3 Bucket**: All public read/write access to S3 is blocked.
2. **CDN Only Entry**: S3 bucket policies are updated to only allow read access from the specific CloudFront OAC Canonical User:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": {
       "Sid": "AllowCloudFrontServicePrincipalReadOnly",
       "Effect": "Allow",
       "Principal": {
         "Service": "cloudfront.amazonaws.com"
       },
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::donghua3d-media-bucket/*",
       "Condition": {
         "StringEquals": {
           "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DIST_ID"
         }
       }
     }
   }
   ```

---

## 4. The 4-Phase Progressive Scaling Blueprint

### Phase 1: Single Instance Monolith (10–20 Users)
* **Compute**: AWS EC2 `t3a.small` (2 vCPUs, 2GB RAM + 2GB Swap Memory).
* **Storage**: 100GB gp3 EBS disk.
* **DB**: SQLite or PostgreSQL container running inside Docker Compose.
* **FFmpeg Pipeline**: Spawns local node subprocesses locked to a maximum of 1 concurrent transcribing job.
* **Monthly Cost**: **~21 USD** (with Savings Plan).

### Phase 2: Decouple Video Assets (100–500 Users)
* **Compute**: EC2 `t3a.medium` (2 vCPUs, 4GB RAM).
* **Storage**: Local EBS disk size reduced to 30GB (holding OS and logs).
* **DB**: Isolated **AWS RDS PostgreSQL** (db.t3.micro, Single AZ).
* **Static Assets**: Moved to **AWS S3** served via **CloudFront CDN** with high edge cache configurations.
* **Monthly Cost**: **~60 USD**.

### Phase 3: Decoupled Job Workers (1,000+ Users)
* **Compute**: ALB (Application Load Balancer) fronting 2x EC2 `t3a.small` API instances.
* **Queue**: **Redis** (AWS ElastiCache or self-hosted container) running **BullMQ**.
* **Workers**: 1x EC2 `c5.large` (Compute-Optimized) Spot Instance dedicated to polling tasks from Redis and executing FFmpeg transcribing, keeping the main API instances free of heavy CPU loads.
* **Monthly Cost**: **~250 USD**.

### Phase 4: Full Enterprise Elasticity (10,000+ Users)
* **Compute**: **AWS ECS (Fargate)** task clusters auto-scaling based on CPU/Memory loads.
* **DB**: **AWS Aurora Serverless v2 PostgreSQL** with active Read Replicas (all catalog searches and tier leaderboard views query the read replica, freeing the master node for transactional writes like watch history and registrations).
* **Security**: CloudFront Signed Cookies enabled, restricting video access to verified premium users.
* **Monthly Cost**: **~1000+ USD** (largely determined by overall egress bandwidth volumes).
