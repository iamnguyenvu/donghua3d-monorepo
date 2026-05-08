```text
██████╗  ██████╗ ███╗   ██╗ ██████╗ ██╗  ██╗██╗   ██╗ █████╗ ██████╗ ██████╗ 
██╔══██╗██╔═══██╗████╗  ██║██╔════╝ ██║  ██║██║   ██║██╔══██╗╚════██╗██╔══██╗
██║  ██║██║   ██║██╔██╗ ██║██║  ███╗███████║██║   ██║███████║ █████╔╝██║  ██║
██║  ██║██║   ██║██║╚██╗██║██║   ██║██╔══██║██║   ██║██╔══██║ ╚═══██╗██║  ██║
██████╔╝╚██████╔╝██║ ╚████║╚██████╔╝██║  ██║╚██████╔╝██║  ██║██████╔╝██████╔╝
╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═════╝ 
```

# 🎬 Donghua3D Monorepo

[![Status](https://img.shields.io/badge/status-planning-45f3ff?style=for-the-badge&logo=codeforces)](https://github.com/iamnguyenvu/donghua3d-monorepo.git)
[![Docker](https://img.shields.io/badge/Docker-enabled-e50914?style=for-the-badge&logo=docker)](https://github.com/iamnguyenvu/donghua3d-monorepo.git)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-00e5ff?style=for-the-badge&logo=prisma)](https://github.com/iamnguyenvu/donghua3d-monorepo.git)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://github.com/iamnguyenvu/donghua3d-monorepo.git)

An enterprise-grade, high-fidelity, and cost-efficient web streaming platform designed specifically for curated Chinese 3D Animation (Donghua). Engineered from **First-Principles** to deliver lag-free HLS streaming, interactive personal and community tier lists, anti-spam rating systems, and recursive comment sections.

> 🌐 **Repository Location**: [https://github.com/iamnguyenvu/donghua3d-monorepo.git](https://github.com/iamnguyenvu/donghua3d-monorepo.git)  
> 🌍 **Vietnamese Version**: Check [README_vi.md](file:///d:/Download/Project/donghua3d/README_vi.md) for the translated specification.

---

## 💎 Premium Platform Features

* **🎥 Elite HLS Playback ($T_{segment} = 8s$)**: Immediate startup and sub-second seeking times powered by a highly customized player overlay wrapping `hls.js`.
* **⚙️ Mutex-Locked Transcoding Pipeline**: Asynchronous worker queues that segment raw MP4 files into optimized keyframe-aligned HLS directories while enforcing a strict single-concurrency limit to safeguard host resources.
* **🛡️ Dual-Track Anti-Spam Rating Engine**: Math-driven reputation weighting models that filter coordinate review bombing and sandboxes accounts under 7 days old.
* **📊 Drag-and-Drop Tier-List Board**: Immersive, physics-based, glassmorphic interfaces allowing users to rank series (S, A, B, C, D, F) with customized sidecar notes.
* **💬 Spoiler-Blurred Comments Tree**: Interactive comment threads featuring CSS blurs that hide plot details until explicitly clicked by the reader.
* **💾 Auto-Resume & Skip Intro segments**: Throttled watch-progress synchronizers that save playback states and floating buttons that skip episode intros.

---

## 🛠️ Unified Monorepo Architecture

This project is built as a highly unified **TypeScript Monorepo**, ensuring single-source-of-truth types and cohesive development operations.

```text
donghua3d-monorepo/
├── docs/                             # Claude Spec-Driven Development Specs
│   ├── 01_system_spec.md             # System scope, bounded contexts, threat model
│   ├── 02_data_spec.md               # PostgreSQL DDL, composite indices, rating math
│   ├── 03_api_spec.md                # REST API routes, JSON payloads, SSE stream formats
│   ├── 04_ui_ux_spec.md              # Cinematic design tokens, custom player, tier board
│   ├── 05_ops_spec.md                # Dockerfiles, Nginx cache, S3 OAC, 4 scaling phases
│   ├── 06_implementation_plan.md     # Chronological task list with verification steps
│   ├── 07_conventions_spec.md        # Naming, git commits, clean code, styling conventions
│   ├── 08_audit_report.md            # Initial source code audit and repository assessment
│   ├── 09_current_system_report.md   # Post-Phase 1 state report and layout audit
│   ├── 10_phase2_implementation.md   # Phase 2 implementation plan (Vidstack, R2, Sockets)
│   ├── 11_video_sources_audit.md     # In-depth video sources and HLS proxy CDN analysis
│   └── 12_premium_4k_architecture.md # Premium 4K hybrid Cloudflare R2 stream architecture
├── nginx/                            # Reverse Proxy Configs
│   └── nginx.conf                    # CORS headers, microcaching policies, video streaming
├── backend/                          # Express.js & TypeScript API Server
│   ├── src/                          # Controllers, middleware, services, router
│   ├── prisma/                       # Database schemas, migrations, seed script
│   └── Dockerfile                    # Multi-stage container packaging with FFmpeg
├── frontend/                         # Next.js & App Router Web Client
│   ├── src/                          # Pages, premium interactive components, CSS
│   └── Dockerfile                    # Multi-stage standalone node execution container
├── docker-compose.yml                # Orchestrates db, api, ui, and reverse proxy
├── .env.example                      # Environment secrets template
└── README.md                         # Project roadmap overview
```

---

## ⚙️ Requirements & Installation

Before proceeding, ensure your local development machine satisfies the following prerequisites:
- **Node.js**: `v20.x` or `v22.x` (LTS versions)
- **Docker & Docker Desktop**: Configured and running
- **FFmpeg**: Installed locally on system path (optional, for direct host CLI tests)

### 1. Clone the repository
```bash
git clone https://github.com/iamnguyenvu/donghua3d-monorepo.git
cd donghua3d-monorepo
```

### 2. Configure environment variables
Copy the template and modify the secrets:
```bash
cp .env.example .env
```

### 3. Build & spin up the containers
To build all microservices and launch Postgres, Express, Next.js standalone, and the Nginx cache proxy simultaneously:
```bash
docker compose up -d --build
```
*Once running, the client will be accessible at [http://localhost](http://localhost) (routed through Nginx proxy Port 80).*

### 4. Database Setup (Inside the API Container)
Generate tables and seed mock catalog records:
```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npx prisma db seed
```

---

## 📑 Claude Spec-Driven Development Specifications

The system is fully specified before writing application code. For deeper code reviews, read our core specification papers:

* 📄 **[01_System Spec](file:///d:/Download/Project/donghua3d/docs/01_system_spec.md)**: High-level scope, technology stacks, bounded contexts, and security threat models.
* 📄 **[02_Database Spec](file:///d:/Download/Project/donghua3d/docs/02_data_spec.md)**: Schemas, compound indexes, and the mathematical formulas for review averages.
* 📄 **[03_API Spec](file:///d:/Download/Project/donghua3d/docs/03_api_spec.md)**: Complete route contracts, request payloads, and Server-Sent Events (SSE) telemetry data.
* 📄 **[04_UI/UX Spec](file:///d:/Download/Project/donghua3d/docs/04_ui_ux_spec.md)**: High-fidelity player controls, glassmorphic styles, and skeleton loadings.
* 📄 **[05_Ops & Caching Spec](file:///d:/Download/Project/donghua3d/docs/05_ops_spec.md)**: Multi-stage Docker packaging, microcaching, and AWS CloudFront setups.
* 📄 **[06_Implementation Plan](file:///d:/Download/Project/donghua3d/docs/06_implementation_plan.md)**: Order of development tasks with specific verify triggers.
* 📄 **[07_Conventions Spec](file:///d:/Download/Project/donghua3d/docs/07_conventions_spec.md)**: Coding parameters, plural API naming, BEM styling, and Angular semantic git rules.
* 📄 **[08_Source Code Audit Report](file:///d:/Download/Project/donghua3d/docs/08_audit_report.md)**: Initial source code security and quality audit results.
* 📄 **[09_Current System Report](file:///d:/Download/Project/donghua3d/docs/09_current_system_report.md)**: Detailed report of current architectural state, CDN seeding, and UI alignment fixes.
* 📄 **[10_Phase 2 Implementation Plan](file:///d:/Download/Project/donghua3d/docs/10_phase2_implementation_plan.md)**: Chronological development roadmap for Vidstack Player, Cloudflare R2, WebSockets, and CI/CD.
* 📄 **[11_Video Sources Audit](file:///d:/Download/Project/donghua3d/docs/11_video_sources_audit.md)**: In-depth technical analysis of hoathinh3d and hh3d HLS streaming proxies and CDN behaviors.
* 📄 **[12_Premium 4K Architecture](file:///d:/Download/Project/donghua3d/docs/12_premium_4k_architecture.md)**: High-level design for hybrid external HLS streaming combined with premium anti-leech 4K R2 hosting.

---

## 🤝 Coding Conventions & Contribution

All contributions must comply with the strict specifications defined in **[07_Conventions Spec](file:///d:/Download/Project/donghua3d/docs/07_conventions_spec.md)**.

### Git Commit Style Rule
Commit messages must follow the Angular Semantic Standard:
`feat(scope): short description in lowercase`

Allowed Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `chore`.
