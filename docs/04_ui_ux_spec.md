# Claude Spec-Driven Development: 04_ui_ux_spec

This document serves as the **UI/UX & Giao diện Thiết kế Cao cấp (04_ui_ux_spec)** for the **Donghua3D** web client (Netflix Cinematic dark theme).

---

## 1. Cinematic Color System & Token Set

To represent the vibrant colors of 3D martial arts cultivation animations, we implement a highly stylized, futuristic dark palette utilizing HSL variables for smooth theme transitions.

| Token Name | Color Value (HEX/HSL) | UI Purpose |
| :--- | :--- | :--- |
| **`--bg-deep`** | `#08090a` / `hsl(210, 15%, 4%)` | Primary background, deepest dark |
| **`--bg-surface`** | `#111315` / `hsl(210, 10%, 8%)` | Cards, navbar, modal containers |
| **`--bg-elevated`** | `#1c1e22` / `hsl(210, 10%, 12%)` | Hover states, active dropdowns |
| **`--brand-neon`** | `#45f3ff` / `hsl(184, 100%, 63%)` | Accent teal, primary action glow |
| **`--brand-red`** | `#e50914` / `hsl(357, 92%, 47%)` | Cinematic warning/active play indicator |
| **`--text-primary`**| `#ffffff` / `hsl(0, 0%, 100%)` | High-contrast copy text |
| **`--text-muted`**  | `#9ca3af` / `hsl(220, 9%, 65%)` | Secondary metadata labels |

### 1.1 Special UI Effects
* **Glassmorphism Border Glow**:
  ```css
  .glass-card {
    background: rgba(17, 19, 21, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  .glass-card:hover {
    border-color: var(--brand-neon);
    box-shadow: 0 0 15px rgba(69, 243, 255, 0.25);
    transform: translateY(-4px);
  }
  ```

---

## 2. Page & Layout Containers

```text
+-------------------------------------------------------------+
|  [Logo] Donghua3D     Home   Tier Lists   Admin    [Avatar]  | <-- Glass Navbar
+-------------------------------------------------------------+
|                                                             |
|   =======================================================   |
|   |                   CINE HERO BANNER                  |   | <-- Cinematic Hero Section
|   |         Soul Land: Episode 263 (Grand Finale)       |   |
|   |         [ > Play Now ]      [ + My List ]           |   |
|   =======================================================   |
|                                                             |
|   My Personal Tier List                                     |
|   +-----------------------------------------------------+   |
|   | S-Tier | [Movie Card] [Movie Card]                  |   | <-- Drag & Drop Board
|   +-----------------------------------------------------+   |
|                                                             |
|   Trending Series (Top Ratings)                             |
|   [Card]   [Card]   [Card]   [Card]   [Card]   [Card]       | <-- Grid Layout
|                                                             |
+-------------------------------------------------------------+
```

### 2.1 The Glassmorphic Header (Navbar)
* **Behavior**: Fixed height (`72px`), completely sticky (`top-0`), initially transparent. Transitioning to integrated dark glassmorphism once scrolled more than `20px` down.
* **Layout**: Left aligned brand logo with a neon underline, centered navigation items, right aligned profile card containing reputation score tags.

---

## 3. High-Fidelity Custom HLS Player Component

Standard HTML5 player controls look unpolished and generic. We build a fully custom control interface overlay running on top of HLS.js.

```text
+-------------------------------------------------------------+
|                         [ Video Player ]                     |
|                                                             |
|  [ Buffering Spinner Grid ... ]                             |
|                                                             |
|                                                             |
|                                                             |
| +---------------------------------------------------------+ |
| | [=======|==============================================] | | <-- Scrubber Line
| +---------------------------------------------------------+ |
| | [Play]  [Back 10s]  [Vol ==|==]  05:12 / 20:00   [1080p]| | <-- Control Bar
+-------------------------------------------------------------+
```

### 3.1 Control Bar Overlay Architecture
- **Timeline Scrubber**:
  - Linear horizontal track representing progress (`Episode.duration`).
  - Active filled seek-bar using `--brand-red`.
  - Floating tooltip reflecting targeted hour:minute:second timestamp when hovering anywhere on the timeline scrub track.
- **Volume Controller**:
  - Dynamic volume icon (switches between Mute, Low, High based on input state).
  - Hover expander: Hovering over the volume button expands a smooth vertical volume slider input.
- **Theater / Fullscreen Options**:
  - Theater Mode: Toggles wider layout container within standard document flow.
  - Native Fullscreen: Integrates with browser HTML5 Fullscreen API, presenting custom control overlay bars in active hardware rendering modes.
- **Buffer Layer**:
  - Under client latency checks (player state waiting), a subtle glow grid with rotating neon loader spinner overlays the center screen.

### 3.2 Premium Interactivity & Auto-Resume
- **Pulse Progress Tracker**:
  - The video player throttles state updates and makes a `POST /api/watch-history` request every **10 seconds** of active watching to record `progress`.
- **Auto-Resume Overlay Banner**:
  - When entering an episode page, if `WatchHistory.progress > 0`, a bottom-left glassmorphic alert triggers: `"Bạn đang xem dở tại 05:12. [Xem tiếp]"`. Clicking on it immediately seeks the HLS playback offset.
- **Quick-Skip Intro Button (Skip OP/ED)**:
  - Using episode metadata markers (`introStart`, `introEnd`), a glassmorphic button floating above the lower-right scrubber reads `"Bỏ qua đoạn mở đầu"`. Clicking immediately seeks the video timeline to the specified `introEnd` second.

### 3.3 Key Shortcuts Support
* `Spacebar`: Toggle Play/Pause.
* `ArrowLeft`: Seek backward 10 seconds.
* `ArrowRight`: Seek forward 10 seconds.
* `ArrowUp`: Increase volume by 5%.
* `ArrowDown`: Decrease volume by 5%.
* `F`: Toggle Fullscreen.
* `S`: Skip intro segment.

---

## 4. Drag-and-Drop Tier List Board

The Personal Tier List dashboard provides an engaging drag-and-drop system using `@hello-pangea/dnd` or HTML5 native drag APIs.

### 4.1 Tier Rows Layout Specification
* Rows are stacked vertically in descending order: **S**, **A**, **B**, **C**, **D**, **F**.
* Each row has a colored left-hand badge reflecting its character class:
  - **S-Tier**: Gradient Purple/Crimson (`#ff007f` to `#7f00ff`) with a subtle border pulse.
  - **A-Tier**: Deep Neon Orange (`#ff5e00`).
  - **B-Tier**: Golden Yellow (`#ffb700`).
  - **C-Tier**: Deep Teal (`#00e5ff`).
  - **D-Tier**: Neutral Muted Grey (`#6b7280`).
  - **F-Tier**: Slate Dark Brown (`#4b382a`).
* Cards dragged within or between row segments triggers automatic `POST /api/tier-list` requests, shifting states.

---

## 5. Spoiler Comment Component

Donghua episodes feature major plot twists. To preserve user experience:
* Comments tagged with `isSpoiler = true` apply a CSS blur to the container.
* When blurred, the text is invisible, and a prompt is overlayed: `"Cảnh báo spoil - Nhấn để xem"`.
* Clicking on the blurred block removes the CSS filter class instantly.

```css
.spoiler-text-blurred {
  filter: blur(10px);
  user-select: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 4px;
  transition: filter 0.4s ease;
}
.spoiler-text-blurred:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

---

## 6. Admin Panel: Progress Visualizer

When an administrator uploads an episode and initiates the FFmpeg transcoder, the status view renders the live SSE (`/api/upload/status/:episodeId`) payload.

- **Dynamic Progress Bar**: A horizontal fill track with a pulsing `--brand-neon` glow.
- **Telemetry Console**: A dark terminal window displaying real-time transcribing variables:
  - **Percentage Completed**: Rendered in large bold figures (e.g. `45.2%`).
  - **Encoding FPS**: The frame speed at which FFmpeg compiles segments (e.g., `25 FPS`).
  - **ETA**: Projected time left to complete encoding (e.g., `45s`).
- Once finished, the container transitions from progress view to active stream player view, enabling instant verification.

---

## 7. Skeleton Loading States (Visual Polish)

To avoid raw, sudden jumps during fetch wait times, elements are represented using fluid animated skeleton loaders.

```css
@keyframes pulse-glow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.skeleton-loading {
  background: linear-gradient(-90deg, #111315 0%, #1c1e22 50%, #111315 100%);
  background-size: 400% 400%;
  animation: pulse-glow 1.5s ease infinite;
}
```
* **Movie Grid Skeletons**: 6 empty card structures rendering glowing gradient profiles, replacing generic spinner icons.
* **Comment Skeletons**: Alternating line profiles representing avatar icons, username segments, and comment bodies.
