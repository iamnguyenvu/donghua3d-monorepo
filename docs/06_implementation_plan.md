# Claude Spec-Driven Development: 06_implementation_plan

This document outlines the chronological, step-by-step development roadmap for **Donghua3D**. Each task outlines specific file directories, technical scopes, and explicit verification checks to ensure success.

---

## 1. Phase 1: Environment & Orchestration (Day 1)

### Task 1.1: Root Monorepo Structure & .gitignore
- **Files Affected**:
  - `d:\Download\Project\donghua3d\.gitignore`
- **Scope**: Initialize the workspace directories, set up the monorepo structure, and configure `.gitignore` to prevent pushing local uploads, database data directories, or environment secrets.
- **Verification**: Run `git status` to ensure all ignored paths are filtered.

### Task 1.2: Orchestration & Docker Compose
- **Files Affected**:
  - `d:\Download\Project\donghua3d\docker-compose.yml`
- **Scope**: Write the root-level Orchestration file defining three core containers: `db` (Postgres 15), `backend` (Express API), `frontend` (Next.js UI), and `nginx` (Reverse Proxy). Set up common volume shares.
- **Verification**: Ensure the file syntax compiles successfully with `docker-compose config`.

### Task 1.3: Nginx Reverse Proxy Configuration
- **Files Affected**:
  - `d:\Download\Project\donghua3d\nginx\nginx.conf`
- **Scope**: Write the optimized Nginx reverse proxy configuration. Setup upstream proxies, enable static video delivery through mapped folders, configure CORS headers, and apply cache parameters for `.ts` and `.m3u8` files.
- **Verification**: Start the container and check configurations using `nginx -t`.

---

## 2. Phase 2: Database Initialization & Migrations (Day 2)

### Task 2.1: Prisma ORM Initialization
- **Files Affected**:
  - `d:\Download\Project\donghua3d\backend\prisma\schema.prisma`
  - `d:\Download\Project\donghua3d\backend\package.json`
- **Scope**: Initialize Prisma inside the backend directory. Write the complete relational data schema reflecting the specifications in **02_data_spec.md**.
- **Verification**: Run `npx prisma validate` inside `/backend` to verify relational links.

### Task 2.2: DB Connection & Seed Configurations
- **Files Affected**:
  - `d:\Download\Project\donghua3d\backend\src\db.ts`
  - `d:\Download\Project\donghua3d\backend\prisma\seed.ts`
- **Scope**: Write the `db.ts` file implementing the PrismaClient singleton. Write the seed file (`seed.ts`) to populate default movies, episodes, and an admin user credentials set.
- **Verification**: Run the database seeding with `npx prisma db seed` and confirm Postgres records creation.

---

## 3. Phase 3: Core API Services & Logic (Day 3)

### Task 3.1: Config Module & Auth Middleware
- **Files Affected**:
  - `d:\Download\Project\donghua3d\backend\src\config.ts`
  - `d:\Download\Project\donghua3d\backend\src\middleware\auth.middleware.ts`
- **Scope**: Build the configuration loader handling environments. Develop standard JWT verification route guards to extract user payload states.
- **Verification**: Unit test the middleware using mock JWT tokens in Postman.

### Task 3.2: Unified Storage Service
- **Files Affected**:
  - `d:\Download\Project\donghua3d\backend\src\services\storage.service.ts`
- **Scope**: Write the abstract Storage Service handling uploads. Implement `LocalStorageService` to handle local disk writes, with structural placeholders for `S3StorageService`.
- **Verification**: Upload a sample thumbnail to `/static/uploads` and ensure Nginx serves it.

### Task 3.3: Asynchronous FFmpeg Transcoding Service
- **Files Affected**:
  - `d:\Download\Project\donghua3d\backend\src\services\encoding.service.ts`
- **Scope**: Develop the core transcoding service wrapping `fluent-ffmpeg`. The service must:
  - Create episode HLS directories.
  - Spawn FFmpeg with the exact keyframe flags defined in **01_system_spec.md**.
  - Track progress percentage.
  - Implement a mutex lock ensuring exactly one concurrent transcribing process.
- **Verification**: Pass an MP4 video to the service, and verify that keyframe-aligned HLS directories are generated.

### Task 3.4: API Controllers (Auth, Movies, Rating, Comments, Tier List)
- **Files Affected**:
  - `d:\Download\Project\donghua3d\backend\src\controllers\*`
- **Scope**: Complete the API endpoints mapping the contracts defined in **03_api_spec.md**.
- **Verification**: Execute integration tests against API routes using Postman, ensuring correct ratings recalculation logic.

---

## 4. Phase 4: Cinematic Next.js Client (Day 4 & 5)

### Task 4.1: Styling Tokens & Global CSS
- **Files Affected**:
  - `d:\Download\Project\donghua3d\frontend\src\styles\globals.css`
- **Scope**: Build the global stylesheet implementing HSL tokens, glassmorphic layout rules, spoiler blurs, and animated skeletons.
- **Verification**: Ensure Next.js starts up with the dark, styled background template.

### Task 4.2: Movie Grid Dashboard & Layouts
- **Files Affected**:
  - `d:\Download\Project\donghua3d\frontend\src\app\page.tsx`
  - `d:\Download\Project\donghua3d\frontend\src\components\Navbar.tsx`
- **Scope**: Create the Netflix-style home page dashboard with glassmorphic top headers, dynamic search bars, and catalog grid filters.
- **Verification**: Confirm responsive card resizing on mobile viewport profiles.

### Task 4.3: Custom HLS Player UI
- **Files Affected**:
  - `d:\Download\Project\donghua3d\frontend\src\components\CustomPlayer.tsx`
- **Scope**: Develop the custom video player control overlays wrapping `hls.js`. Implement timeline scrubbers, volume sliders, full-screen options, and hotkeys.
- **Verification**: Play a transcoded HLS stream, click to seek on the progress line, and verify there is no video buffering.

### Task 4.4: Personal Drag-and-Drop Tier List
- **Files Affected**:
  - `d:\Download\Project\donghua3d\frontend\src\app\tier-list\page.tsx`
- **Scope**: Build the interactive Tier Board rows (S, A, B, C, D, F). Integrate Drag-and-Drop mechanics, enabling users to reorder series and save notes.
- **Verification**: Drag a movie card to a new tier and verify that the global database score update request triggers correctly.

### Task 4.5: Nested Comment Thread UI
- **Files Affected**:
  - `d:\Download\Project\donghua3d\frontend\src\components\CommentSection.tsx`
- **Scope**: Develop the nested comment feed. Add spoiler toggle cards, recursive reply forms, and moderator flagging tags.
- **Verification**: Check that typing a spoiler-flagged comment blurs the text container in the UI.

---

## 5. Phase 5: Verification & DevOps Deploy (Day 6)

### Task 5.1: Multi-Stage Container Packaging
- **Files Affected**:
  - `d:\Download\Project\donghua3d\backend\Dockerfile`
  - `d:\Download\Project\donghua3d\frontend\Dockerfile`
- **Scope**: Set up the optimized multi-stage Dockerfiles specified in **05_ops_spec.md**.
- **Verification**: Run local container builds to ensure the images are tiny ($<150\text{ MB}$).

### Task 5.2: Live EC2 Server Deployment
- **Files Affected**:
  - Project deployment scripts
- **Scope**: Upload the codebase to AWS EC2, run Docker Compose, connect the domain name, configure Nginx SSL with Let's Encrypt, and run the final system validation tests.
- **Verification**: Access the live domain, upload an episode as admin, and verify pristine playback on a mobile client.
