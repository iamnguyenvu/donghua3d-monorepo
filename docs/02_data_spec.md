# Claude Spec-Driven Development: 02_data_spec

This document serves as the **Database & Schema Specification (02_data_spec)** for **Donghua3D**. It specifies database enums, PostgreSQL DDL schemas, composite indexes, and the mathematical formulas governing the rating calculations.

---

## 1. Relational Database Schema & Architecture

To visual the structural constraints, compound relations, and indexing paths of Donghua3D, the following entity relationship diagram maps the exact database layout:

```mermaid
erDiagram
    User {
        UUID id PK
        VARCHAR email UNIQUE
        VARCHAR password
        Role role "USER, EXPERT, ADMIN"
        INTEGER reputationScore "0-100"
        TIMESTAMP veteranSince
        TIMESTAMP createdAt
    }

    Movie {
        UUID id PK
        VARCHAR title
        VARCHAR altTitles "JSONB"
        VARCHAR description
        VARCHAR bannerUrl
        VARCHAR posterUrl
        VARCHAR studio
        INTEGER releaseYear
        DOUBLE PRECISION rating
        DOUBLE PRECISION expertRating
        DOUBLE PRECISION audienceRating
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }

    Episode {
        UUID id PK
        UUID movieId FK
        INTEGER episodeNumber
        VARCHAR title
        TEXT description
        VARCHAR videoUrl
        DOUBLE PRECISION duration
        DOUBLE PRECISION introStart
        DOUBLE PRECISION introEnd
        DOUBLE PRECISION outroStart
        DOUBLE PRECISION outroEnd
        VARCHAR thumbnail
        DOUBLE PRECISION rating
        DOUBLE PRECISION expertRating
        DOUBLE PRECISION audienceRating
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }

    Rating {
        UUID id PK
        UUID userId FK
        UUID movieId FK
        UUID episodeId FK
        RatingType ratingType "USER, EXPERT"
        INTEGER value "1-10"
        TEXT review
        BOOLEAN isCredible
        BOOLEAN isApproved
        TIMESTAMP createdAt
    }

    Comment {
        UUID id PK
        UUID userId FK
        UUID movieId FK
        UUID episodeId FK
        UUID parentId FK "self-reference"
        TEXT content
        BOOLEAN isSpoiler
        BOOLEAN isFlagged
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }

    WatchHistory {
        UUID id PK
        UUID userId FK
        UUID episodeId FK
        DOUBLE PRECISION progress "seconds"
        BOOLEAN completed
        TIMESTAMP updatedAt
    }

    PersonalTierList {
        UUID id PK
        UUID userId FK
        UUID movieId FK
        Tier tier "S, A, B, C, D, F"
        TEXT notes
        TIMESTAMP updatedAt
    }

    GlobalTierLeaderboard {
        UUID movieId PK, FK
        INTEGER s_tier_count
        INTEGER a_tier_count
        INTEGER b_tier_count
        INTEGER c_tier_count
        INTEGER d_tier_count
        INTEGER f_tier_count
        DOUBLE PRECISION tierScore
        Tier globalTier
        INTEGER rank
        TIMESTAMP lastCalculated
    }

    User ||--o{ Rating : "posts"
    User ||--o{ Comment : "writes"
    User ||--o{ WatchHistory : "tracks"
    User ||--o{ PersonalTierList : "manages"

    Movie ||--|{ Episode : "contains"
    Movie ||--o{ Rating : "receives"
    Movie ||--o{ Comment : "receives"
    Movie ||--o{ PersonalTierList : "placed_in"
    Movie ||--|| GlobalTierLeaderboard : "cached_rank"

    Episode ||--o{ Rating : "receives"
    Episode ||--o{ Comment : "receives"
    Episode ||--o{ WatchHistory : "tracks_progress"

    Comment ||--o{ Comment : "replies_to"
```

---

## 2. PostgreSQL DDL Specification (Data Definition Language)

We utilize **PostgreSQL (v15+)** for catalog persistence, watch session tracking, and social interactions.

```sql
-- 1. Create Custom Type Enums
CREATE TYPE "Role" AS ENUM ('USER', 'EXPERT', 'ADMIN');
CREATE TYPE "Tier" AS ENUM ('S', 'A', 'B', 'C', 'D', 'F');
CREATE TYPE "RatingType" AS ENUM ('USER', 'EXPERT');

-- 2. User Entity Table
CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" DEFAULT 'USER' NOT NULL,
    "reputationScore" INTEGER DEFAULT 100 NOT NULL CHECK ("reputationScore" BETWEEN 0 AND 100),
    "veteranSince" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 3. Movie Catalog Entity Table (Highly Extended)
CREATE TABLE "Movie" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "altTitles" JSONB DEFAULT '[]'::jsonb NOT NULL,              -- For English, Vietnamese, and Pinyin (e.g. ["Đấu La Đại Lục", "Soul Land"])
    "description" TEXT NOT NULL,
    "thumbnail" VARCHAR(512) NOT NULL,
    "banner" VARCHAR(512),                                      -- Wide cinematic banner
    "genre" VARCHAR(255)[] NOT NULL,                            -- Array indexing (e.g. ["Action", "Cultivation"])
    "studio" VARCHAR(255),                                      -- e.g., "Sparkly Key Animation"
    "director" VARCHAR(255),
    "tags" VARCHAR(100)[] DEFAULT '{}'::varchar[] NOT NULL,     -- e.g. ["Overpowered MC", "Martial Arts"]
    "releaseYear" INTEGER NOT NULL,
    "status" VARCHAR(50) DEFAULT 'ONGOING' NOT NULL,            -- ONGOING, COMPLETED, HIATUS
    "statusTimeline" JSONB DEFAULT '{}'::jsonb NOT NULL,        -- History of status changes
    "rating" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,             -- Calculated composite rating
    "expertRating" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,       -- Isolated expert score
    "audienceRating" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,     -- Isolated standard audience score
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 4. Episode Entity Table
CREATE TABLE "Episode" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "movieId" UUID NOT NULL REFERENCES "Movie"("id") ON DELETE CASCADE,
    "episodeNumber" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "videoUrl" VARCHAR(512) NOT NULL,                          -- Local index.m3u8 path or CloudFront S3 path
    "duration" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,           -- In seconds
    "introStart" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,         -- Video second offset where OP song starts
    "introEnd" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,           -- Video second offset where OP song ends
    "outroStart" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,         -- Video second offset where ED song starts
    "outroEnd" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,           -- Video second offset where ED song ends
    "thumbnail" VARCHAR(512),                                  -- Video thumbnail screen grab
    "rating" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    "expertRating" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    "audienceRating" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "unique_movie_episode" UNIQUE ("movieId", "episodeNumber")
);

-- 5. Rating & Reviews Table (Supports Dual-Track & Spam Mitigation)
CREATE TABLE "Rating" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "episodeId" UUID REFERENCES "Episode"("id") ON DELETE CASCADE,
    "movieId" UUID NOT NULL REFERENCES "Movie"("id") ON DELETE CASCADE,
    "score" INTEGER NOT NULL CHECK ("score" BETWEEN 1 AND 10),
    "reviewTitle" VARCHAR(255),
    "reviewText" TEXT,
    "ratingType" "RatingType" DEFAULT 'USER' NOT NULL,
    "isCredible" BOOLEAN DEFAULT TRUE NOT NULL,
    "isApproved" BOOLEAN DEFAULT TRUE NOT NULL,                -- False by default for experts until admin moderates
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "unique_user_episode_rating" UNIQUE ("userId", "episodeId")
);

-- 6. Watch History Table (Hot client update path)
CREATE TABLE "WatchHistory" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "episodeId" UUID NOT NULL REFERENCES "Episode"("id") ON DELETE CASCADE,
    "progress" DOUBLE PRECISION NOT NULL,                      -- Saved progress offset in seconds
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "unique_user_episode_history" UNIQUE ("userId", "episodeId")
);

-- 7. Nested Comment Table (Recursive threading support)
CREATE TABLE "Comment" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "movieId" UUID NOT NULL REFERENCES "Movie"("id") ON DELETE CASCADE,
    "episodeId" UUID REFERENCES "Episode"("id") ON DELETE CASCADE,
    "parentId" UUID REFERENCES "Comment"("id") ON DELETE CASCADE, -- Standard self-reference
    "content" TEXT NOT NULL,
    "isSpoiler" BOOLEAN DEFAULT FALSE NOT NULL,
    "isFlagged" BOOLEAN DEFAULT FALSE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 8. Personal Tier List Table
CREATE TABLE "PersonalTierList" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "movieId" UUID NOT NULL REFERENCES "Movie"("id") ON DELETE CASCADE,
    "tier" "Tier" NOT NULL,
    "notes" TEXT,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "unique_user_movie_tier" UNIQUE ("userId", "movieId")
);

-- 9. Global Tier Leaderboard Cache Table (Read Optimization)
CREATE TABLE "GlobalTierLeaderboard" (
    "movieId" UUID PRIMARY KEY REFERENCES "Movie"("id") ON DELETE CASCADE,
    "s_tier_count" INTEGER DEFAULT 0 NOT NULL,
    "a_tier_count" INTEGER DEFAULT 0 NOT NULL,
    "b_tier_count" INTEGER DEFAULT 0 NOT NULL,
    "c_tier_count" INTEGER DEFAULT 0 NOT NULL,
    "d_tier_count" INTEGER DEFAULT 0 NOT NULL,
    "f_tier_count" INTEGER DEFAULT 0 NOT NULL,
    "tierScore" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,         -- Numeric rank variable
    "globalTier" "Tier" DEFAULT 'C' NOT NULL,
    "rank" INTEGER,
    "lastCalculated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

## 3. Indexing Matrix (Performance Tuning)

To support instant loading screens, PostgreSQL lookup latency must remain sub-millisecond ($< 5\text{ms}$). We apply B-Tree and Gin composite indexes:

```sql
-- Speed up main homepage catalogue filtering and sorting
CREATE INDEX "idx_movie_release_rating" ON "Movie" ("releaseYear" DESC, "rating" DESC);

-- Index movie detail page (fetches ordered episode lists)
CREATE INDEX "idx_episode_movie_number" ON "Episode" ("movieId", "episodeNumber" ASC);

-- Index comment thread traversal (fetches nested responses matching parent nodes)
CREATE INDEX "idx_comment_traversal" ON "Comment" ("movieId", "episodeId", "parentId", "createdAt" DESC);

-- Composite Index for the anti-spam rating mitigation engine
CREATE INDEX "idx_rating_verification" ON "Rating" ("movieId", "isCredible", "isApproved");

-- Index personal tier listings of specific user accounts
CREATE INDEX "idx_tierlist_user" ON "PersonalTierList" ("userId", "tier");

-- Gin index on JSONB alternative titles for fast Vietnamese/English text searching
CREATE INDEX "idx_movie_titles_gin" ON "Movie" USING gin ("altTitles");
```

---

## 4. Mathematical Formula Spec for Rating Calculations

To defend against coordinate review bombing, ratings are aggregated using a strict, reputation-weighted formula.

### 3.1 Step 1: Episode Level Rating ($R_{ep}$)
The rating of a single episode ($R_{ep}$) is the raw average of all **Credible and Approved** rating scores:

$$R_{ep} = \frac{\sum_{i=1}^{N_{cred}} S_i}{N_{cred}}$$

Where:
* $S_i$ is the rating score (1–10).
* $N_{cred}$ is the number of reviews where `isCredible = true` and `isApproved = true`.
* **The Invariant**: If $N_{cred} = 0$, $R_{ep}$ is set to `NULL` (it does not participate in the overall series score).

### 3.2 Step 2: Parent Movie Level Rating ($R_{movie}$)
The movie's cumulative rating is the average of its **participating** episodes (episodes with at least 1 credible review):

$$R_{movie} = \frac{\sum_{j=1}^{M_{valid}} R_{ep\_j}}{M_{valid}}$$

Where:
* $R_{ep\_j}$ is the rating of episode $j$ (where $R_{ep\_j} \neq \text{NULL}$).
* $M_{valid}$ is the total count of valid episodes.
* **The Rationale**: This protects a series from being severely punished by a single poorly reviewed episode or from having empty, unreleased filler episodes pull down the score.

### 3.3 Step 3: Global Tier Score calculation ($TS_{movie}$)
To convert user tier votes into a mathematically rankable leaderboard, we assign weights to each tier:
* $W_S = 100, W_A = 80, W_B = 60, W_C = 40, W_D = 20, W_F = 0$

$$TS_{movie} = \frac{(C_S \cdot W_S) + (C_A \cdot W_A) + (C_B \cdot W_B) + (C_C \cdot W_C) + (C_D \cdot W_D) + (C_F \cdot W_F)}{\sum C_{all}}$$

Where $C_T$ is the number of user votes in tier $T$. The movie is then mapped to its corresponding Global Letter:
* $TS \ge 90 \implies$ **S-Tier**
* $80 \le TS < 90 \implies$ **A-Tier**
* $60 \le TS < 80 \implies$ **B-Tier**
* $40 \le TS < 60 \implies$ **C-Tier**
* $20 \le TS < 40 \implies$ **D-Tier**
* $TS < 20 \implies$ **F-Tier**
