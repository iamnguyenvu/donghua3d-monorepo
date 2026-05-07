# Claude Spec-Driven Development: 03_api_spec

This document serves as the **API & Interface Specification (03_api_spec)** for **Donghua3D**. It specifies the REST API endpoints, input/output schemas, error formats, and Server-Sent Events (SSE) telemetry data streams.

---

## 1. Global API Standards

### 1.1 Content Negotiation & Security Headers
All API communications must enforce:
* `Content-Type: application/json`
* `Accept: application/json`
* `Authorization: Bearer <JWT_TOKEN>` (for guarded routes)

### 1.2 Unified Error Response Format
When a request fails, the API must return a structured JSON error body instead of raw HTML/stack traces:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The email field must be a valid email address.",
    "details": [
      { "field": "email", "issue": "invalid_format" }
    ]
  },
  "timestamp": "2026-05-07T03:10:00Z"
}
```

Standard Error Codes:
- `UNAUTHORIZED`: Token missing, invalid, or expired.
- `FORBIDDEN`: User lacks role permissions (e.g., standard user calling admin route).
- `NOT_FOUND`: Resource does not exist.
- `RATE_LIMIT_EXCEEDED`: API calls exceeding throttling constraints.
- `TRANSLATION_FAILED`: FFmpeg transcribing pipeline aborted.
- `BAD_REQUEST`: Invalid input payloads.

---

## 2. Authentication Context

### 2.1 Register User Account
* **Route**: `POST /api/auth/register`
* **Auth Guard**: None (Public)
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "1a1c97a8-4228-469b-8671-5f05b0d0cda8",
      "email": "user@example.com",
      "role": "USER",
      "reputationScore": 100
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

### 2.2 Authenticate / Login User
* **Route**: `POST /api/auth/login`
* **Auth Guard**: None (Public)
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "1a1c97a8-4228-469b-8671-5f05b0d0cda8",
      "email": "user@example.com",
      "role": "USER",
      "reputationScore": 100
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

## 3. Catalog & Movies Context

### 3.1 Get Paginated Movies List
* **Route**: `GET /api/movies`
* **Auth Guard**: None (Public)
* **Query Parameters**:
  - `page` (integer, optional, default: 1)
  - `limit` (integer, optional, default: 12)
  - `genre` (string, optional, filters by genre)
  - `search` (string, optional, triggers text search against alternate titles)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "movies": [
      {
        "id": "4cf5ca1c-df01-4475-8fb9-9fa9fcbc6895",
        "title": "Soul Land (Douluo Dalu)",
        "altTitles": ["Đấu La Đại Lục", "斗罗大陆"],
        "description": "Tang San, a brilliant weapon designer of the Tang Sect...",
        "thumbnail": "/static/uploads/thumbnails/soulland.webp",
        "genre": ["Action", "Cultivation", "Fantasy"],
        "rating": 9.2,
        "releaseYear": 2018,
        "status": "COMPLETED",
        "_count": {
          "episodes": 263
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 45
    }
  }
  ```

### 3.2 Get Movie Details (with Episode List)
* **Route**: `GET /api/movies/:id`
* **Auth Guard**: None (Public)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "movie": {
      "id": "4cf5ca1c-df01-4475-8fb9-9fa9fcbc6895",
      "title": "Soul Land (Douluo Dalu)",
      "altTitles": ["Đấu La Đại Lục", "斗罗大陆"],
      "description": "Tang San, a brilliant weapon designer of the Tang Sect...",
      "thumbnail": "/static/uploads/thumbnails/soulland.webp",
      "banner": "/static/uploads/banners/soulland_banner.webp",
      "genre": ["Action", "Cultivation", "Fantasy"],
      "studio": "Sparkly Key Animation",
      "director": "Shen Leping",
      "tags": ["Isekai", "Overpowered MC", "Martial Arts"],
      "rating": 9.2,
      "expertRating": 8.9,
      "audienceRating": 9.3,
      "releaseYear": 2018,
      "status": "COMPLETED",
      "episodes": [
        {
          "id": "78fc421d-768a-441d-91b3-4f91d03a11a1",
          "episodeNumber": 1,
          "title": "Awakening of the Martial Soul",
          "duration": 1200.5,
          "rating": 9.0
        }
      ]
    }
  }
  ```

### 3.3 Create Movie Series (Admin Catalog Entry)
* **Route**: `POST /api/movies`
* **Auth Guard**: Yes (Requires `role: ADMIN`)
* **Request Body**:
  ```json
  {
    "title": "Perfect World (Wanmei Shijie)",
    "altTitles": ["Thế Giới Hoàn Mỹ", "完美世界"],
    "description": "Born into a unique world where villages fight for power...",
    "thumbnail": "/static/uploads/thumbnails/perfectworld.webp",
    "banner": "/static/uploads/banners/perfectworld_banner.webp",
    "genre": ["Action", "Cultivation"],
    "studio": "Foch Film",
    "director": "Yuan Jie",
    "tags": ["Overpowered MC", "Martial Arts", "Deities"],
    "releaseYear": 2021,
    "status": "ONGOING"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "movie": {
      "id": "e8d47451-b8ef-4171-bdc2-5192bf8ef022",
      "title": "Perfect World (Wanmei Shijie)",
      "createdAt": "2026-05-07T03:11:00Z"
    }
  }
  ```

---

## 4. Advanced Rating Context

### 4.1 Post Episode Rating (Anti-Spam Filtered)
* **Route**: `POST /api/ratings`
* **Auth Guard**: Yes (Requires `role: USER` or `role: EXPERT`)
* **Request Body**:
  ```json
  {
    "movieId": "4cf5ca1c-df01-4475-8fb9-9fa9fcbc6895",
    "episodeId": "78fc421d-768a-441d-91b3-4f91d03a11a1",
    "score": 9,
    "reviewTitle": "Incredible Animation Quality",
    "reviewText": "The real-time cinematic render quality has taken a huge leap forward..."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "rating": {
      "id": "bb912fc0-ff2e-461d-bf1f-b519cda11a22",
      "score": 9,
      "isCredible": true,
      "isApproved": true,
      "ratingType": "USER"
    },
    "message": "Rating registered successfully."
  }
  ```
* **Note on Expert Roles**: If the calling user has `role: EXPERT`, `isApproved` defaults to `false` (pending review). Once verified by an admin, the review is made public and aggregates into `expertRating`.

---

## 5. Comments & Community Context

### 5.1 Post Comment to Movie/Episode
* **Route**: `POST /api/comments`
* **Auth Guard**: Yes (Requires `role: USER`, `role: EXPERT`, or `role: ADMIN`)
* **Request Body**:
  ```json
  {
    "movieId": "4cf5ca1c-df01-4475-8fb9-9fa9fcbc6895",
    "episodeId": "78fc421d-768a-441d-91b3-4f91d03a11a1", -- optional
    "parentId": null,                                  -- optional (specify for nesting)
    "content": "Tang San's Blue Silver Emperor form looks amazing!",
    "isSpoiler": false
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "comment": {
      "id": "ef8a7a1b-1234-5678-abcd-ef0123456789",
      "content": "Tang San's Blue Silver Emperor form looks amazing!",
      "isSpoiler": false,
      "createdAt": "2026-05-07T03:12:00Z"
    }
  }
  ```

---

## 6. Personal & Global Tier Lists Context

### 6.1 Upsert Personal Tier Rating
* **Route**: `POST /api/tier-list`
* **Auth Guard**: Yes (Required)
* **Request Body**:
  ```json
  {
    "movieId": "4cf5ca1c-df01-4475-8fb9-9fa9fcbc6895",
    "tier": "S",
    "notes": "My absolute favorite Donghua. Pacing is unmatched."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "tierEntry": {
      "movieId": "4cf5ca1c-df01-4475-8fb9-9fa9fcbc6895",
      "tier": "S",
      "notes": "My absolute favorite Donghua. Pacing is unmatched."
    }
  }
  ```

### 6.2 Get Cached Global Community Tier Leaderboard
* **Route**: `GET /api/tier-list/global`
* **Auth Guard**: None (Public - Highly cached via Nginx and In-Memory LRU)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "leaderboard": [
      {
        "rank": 1,
        "movie": {
          "id": "4cf5ca1c-df01-4475-8fb9-9fa9fcbc6895",
          "title": "Soul Land (Douluo Dalu)",
          "thumbnail": "/static/uploads/thumbnails/soulland.webp"
        },
        "globalTier": "S",
        "tierScore": 96.5,
        "voteCounts": {
          "S": 1450,
          "A": 220,
          "B": 42,
          "C": 12,
          "D": 2,
          "F": 1
        }
      }
    ]
  }
  ```

---

## 7. Media Ingestion & FFmpeg Streaming Real-Time SSE

### 7.1 Multi-Part Raw Video Upload (Admin Upload Flow)
* **Route**: `POST /api/upload/video`
* **Auth Guard**: Yes (Requires `role: ADMIN`)
* **Content-Type**: `multipart/form-data`
* **Payload**: File under key `video`.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "tempFilePath": "/app/uploads/temp/fc8942-7fa-11e5.mp4"
  }
  ```

### 7.2 Create Episode & Trigger Transcoder
* **Route**: `POST /api/episodes`
* **Auth Guard**: Yes (Requires `role: ADMIN`)
* **Request Body**:
  ```json
  {
    "movieId": "e8d47451-b8ef-4171-bdc2-5192bf8ef022",
    "episodeNumber": 1,
    "title": "The Peerless Child",
    "description": "Shi Hao shows his innate potential in the Stone Village...",
    "tempVideoPath": "/app/uploads/temp/fc8942-7fa-11e5.mp4"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "episodeId": "78fc421d-768a-441d-91b3-4f91d03a11a1",
    "encodingStatus": "PROCESSING",
    "statusUrl": "/api/upload/status/78fc421d-768a-441d-91b3-4f91d03a11a1"
  }
  ```

### 7.3 Real-Time Transcoding Event Stream (Server-Sent Events)
An SSE endpoint allows the Admin Client UI to receive continuous, real-time transcoding progress directly from the backend without polling.

* **Route**: `GET /api/upload/status/:episodeId`
* **Auth Guard**: Yes (Requires `role: ADMIN`)
* **Response Headers**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`

#### Event Stream Flow Structure:
```text
event: progress
data: {"percent": 12.5, "fps": 24, "eta": "145s"}

event: progress
data: {"percent": 45.1, "fps": 25, "eta": "52s"}

event: progress
data: {"percent": 99.8, "fps": 24, "eta": "0s"}

event: complete
data: {"videoUrl": "/static/uploads/hls/78fc421d-768a-441d-91b3-4f91d03a11a1/index.m3u8", "duration": 1205.2}
```

If the encoding encounters a fault (e.g. invalid codec, corrupted MP4 wrapper):
```text
event: error
data: {"message": "FFmpeg exited with error code 1. Corrupted input frame detected."}
```
*Upon complete or error events, the server automatically terminates the SSE stream connection.*
