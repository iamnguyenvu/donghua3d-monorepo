# Claude Spec-Driven Development: 07_conventions_spec

This document outlines the coding standards, naming rules, style guidelines, and collaboration workflows for **Donghua3D**, ensuring codebase consistency and mechanical sympathy.

---

## 1. Directory & File Naming Conventions

All sub-modules, directories, and source files must adhere to the following rules:

* **Directories & Packages**: Strictly lowercase kebab-case (e.g., `api-gateway`, `custom-player`, `nested-comments`).
* **TypeScript Files (`.ts`, `.tsx`)**:
  - Components, Classes, and Interfaces: PascalCase (e.g., `CustomPlayer.tsx`, `StorageService.ts`).
  - Helper functions, routes, controllers, and scripts: lowercase kebab-case or camelCase (e.g., `auth.middleware.ts`, `db.ts`, `uuid-helper.ts`).
* **Vanilla CSS files**: lowercase kebab-case, sharing the exact name of the component it styles (e.g., `custom-player.css` next to `CustomPlayer.tsx`).

---

## 2. Git Commit Conventions (Semantic Commits)

Commit messages must strictly follow the Angular Semantic Commit message template:
`type(scope): short description in lowercase`

### 2.1 Types Allowed:
- `feat`: A new user-facing feature (e.g., `feat(player): add skip intro button triggers`).
- `fix`: A bug patch (e.g., `fix(auth): resolve JWT expiration token parsing fault`).
- `docs`: Documentation edits only (e.g., `docs(api): refine SSE telemetry stream description`).
- `style`: Changes that do not affect code logic (e.g., spacing, layout, linting, BEM classes).
- `refactor`: Structural code edits that neither fix bugs nor add features.
- `perf`: Performance optimizations (e.g., `perf(nginx): enable gzip compression for JSON outputs`).
- `chore`: Build tooling, dependency upgrades, or configuration adjustments.

---

## 3. TypeScript & Clean Code Guidelines

To minimize runtime errors, the TypeScript configuration must enforce:
* `strict: true` (which includes `noImplicitAny: true` and `strictNullChecks: true`).
* `noUnusedLocals: true` and `noUnusedParameters: true`.

### 3.1 Coding Practices:
- **Avoid `any`**: The use of `any` is strictly prohibited. All objects, payloads, and variables must be explicitly typed or cast to `unknown` followed by custom runtime validation guards.
- **Immutable State**: Prefer immutable data arrays and object mappings. Use ES6 methods (`map`, `filter`, `reduce`) over raw mutating `for` or `while` loops wherever applicable.
- **Asynchronous Execution**: All network operations, database queries, and file-system operations must use `async/await`. Avoid nesting `.then().catch()` chains.

---

## 4. RESTful API Naming Protocols

All backend controllers and routes must follow strict REST resource naming rules:
- **Nouns over Verbs**: Use plural nouns to identify endpoints (e.g., `/api/movies` instead of `/api/getMovie`).
- **Standard HTTP Methods**:
  - `GET`: Fetch resources (Idempotent).
  - `POST`: Create a new resource.
  - `PUT`: Completely replace an existing resource.
  - `PATCH`: Perform a partial update.
  - `DELETE`: Remove a resource.
- **Versioning**: All active endpoints must be prefixed with `/api/` (for modular deployment).

---

## 5. Database & Prisma Naming Protocols

To prevent SQL schema-drift and mismatch:
- **PostgreSQL Tables**: Named in PascalCase (e.g., `WatchHistory`, `PersonalTierList`).
- **Columns & Fields**: Named in camelCase (e.g., `reputationScore`, `isCredible`).
- **Foreign Keys**: Linked using explicit relational constraints (e.g., `userId UUID REFERENCES "User"("id") ON DELETE CASCADE`).
- **Composite Constraints**: Name unique compound indices clearly (e.g., `unique_user_movie_tier` on (`userId`, `movieId`)).

---

## 6. Vanilla CSS & Styling Conventions

Since the platform utilizes Vanilla CSS for maximum flexibility and performance:
- **BEM (Block-Element-Modifier)**: Use BEM or a highly descriptive, cohesive class hierarchy:
  - Block: `.player`
  - Element: `.player__scrubber`
  - Modifier: `.player__scrubber--active`
- **Dynamic Styling**: Avoid inline styling (`style={{...}}`) except for dynamic calculated values like progress bar fills (`style={{ width: `${percent}%` }}`).
- **Responsive Web Design (RWD)**: Style components desktop-first but guarantee elegant rendering on mobile using strict CSS media query break-points:
  ```css
  /* Desktop standard */
  .grid-layout { display: grid; grid-template-columns: repeat(4, 1fr); }
  
  /* Mobile responsive breakpoint */
  @media (max-width: 768px) {
    .grid-layout { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 480px) {
    .grid-layout { grid-template-columns: 1fr; }
  }
  ```
