# Claude Spec-Driven Development: 04_ui_ux_spec

This document serves as the **UI/UX & Giao diện Thiết kế Siêu Cấp (04_ui_ux_spec)** for the **Donghua3D** monorepo client application. It outlines a world-class, premium cinematic visual identity (Netflix/Steam-grade dark space theme) and details exact interactive ergonomics.

---

## 1. Cinematic Visual Identity & Fluid Color Tokens

To reflect the epic scale, cultivation, and mystical aura of 3D Chinese animation (Donghua), we construct a rich, highly immersive dark-void layout utilizing custom CSS properties and Tailwind v4 design token integrations.

### 1.1 Color Tokens System
| Token Name | HEX / HSL Value | Tailwind Class Map | UI Ergonomic Role |
| :--- | :--- | :--- | :--- |
| **`--bg-deep`** | `#050508` / `hsl(240, 23%, 2.5%)` | `bg-deep` | Main site background, deep black void |
| **`--bg-surface`** | `#0d0e14` / `hsl(231, 28%, 6.5%)` | `bg-surface` | Glassmorphic navigation headers, cards, modals |
| **`--bg-elevated`** | `#141622` / `hsl(231, 25%, 10.5%)` | `bg-elevated` | Active/focused dropdowns, hovering containers |
| **`--brand-violet`**| `#8a2be2` / `hsl(271, 76%, 53%)` | `text-primary` | Neon violet. Main primary brand action glow |
| **`--brand-cyan`**  | `#00f2fe` / `hsl(184, 100%, 50%)` | `text-secondary` | Cyber electric cyan. Active tabs, highlighted elements |
| **`--brand-crimson`**| `#ff004f` / `hsl(341, 100%, 50%)` | `text-danger` | Imperial warning/action indicator, active play line |
| **`--brand-amber`**  | `#f5a623` / `hsl(38, 92%, 55%)` | `text-warning` | Deep gold. Verified tags, professional tier scores |
| **`--text-bright`** | `#f8f9fa` / `hsl(210, 15%, 97%)` | `text-white` | Max contrast reading copy & titles |
| **`--text-dim`**    | `#8e92a2` / `hsl(228, 9%, 60%)` | `text-zinc-400` | Secondary contextual metadata labels |

### 1.2 Typography Hierarchy
We employ Google Fonts dynamically to create extreme contrast and premium editorial layouts:
*   **Headlines & Action Labels**: `Space Grotesk` (Sans-serif, weight `500`/`700`/`800`). Built with letter-spacing reductions (`tracking-tight` / `-0.03em`) for a solid futuristic, punchy feeling.
*   **Content Copy & Metadata**: `Outfit` (Sans-serif, weight `300`/`400`/`600`). Soft, circular geometric shapes optimized for high readability against absolute dark backgrounds.

---

## 2. Elite Design Tokens & Micro-Interactions

An ultra-premium interface must feel responsive and alive. Static elements are banned; every card, button, and layout container must react dynamically to client focus.

### 2.1 Glassmorphism & Translucent Gradient Borders
Every surface is treated as a piece of curved celestial glass.
```css
.premium-glass {
  background: rgba(13, 14, 20, 0.45);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 
    0 4px 30px rgba(0, 0, 0, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.05);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.premium-glass:hover {
  background: rgba(20, 22, 34, 0.55);
  border-color: rgba(0, 242, 254, 0.2);
  box-shadow: 
    0 15px 45px rgba(0, 0, 0, 0.7),
    0 0 20px rgba(0, 242, 254, 0.05);
  transform: translateY(-4px);
}
```

### 2.2 Glowing Accent Gradients
High-contrast elements utilize a double-gradient radial border to establish depth:
```css
.glow-accent-hover {
  position: relative;
}
.glow-accent-hover::after {
  content: '';
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, var(--brand-violet), var(--brand-cyan));
  border-radius: inherit;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.glow-accent-hover:hover::after {
  opacity: 1;
}
```

---

## 3. High-Fidelity Responsive Component Layouts

```text
+-----------------------------------------------------------------------------------+
|  💎 Donghua3D        [ Trang Chủ ]   [ Bảng Xếp Hạng ]   [ Đọc Truyện ]    (👤 Admin) |  <-- Glass Sticky Navbar
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +=============================================================================+  |
|  |  🌌 CAROUSEL BANNER: THẾ GIỚI HOÀN MỸ (Shi Hao Epic Fight)                   |  |  <-- Premium Banner Slider
|  |  ⭐ 9.8 / 10 | 📺 Foch Film                                                 |  |
|  |                                                                             |  |
|  |  [ ▶ XEM NGAY TẬP 1 ]      [ ☰ DANH SÁCH TẬP ]       [ ➕ YÊU THÍCH ]        |  |
|  +=============================================================================+  |
|                                                                                   |
|   Xu Hướng Thịnh Hành (S-Tier Leaders)                                            |
|   +-------------------+  +-------------------+  +-------------------+             |
|   | [Image Cover]     |  | [Image Cover]     |  | [Image Cover]     |             |  |
|   | Perfect World     |  | Soul Land         |  | Mortals Journey   |             |  <-- Dynamic Glass Cards
|   | ⭐ 9.8            |  | ⭐ 9.2            |  | ⭐ 9.5            |             |
|   +-------------------+  +-------------------+  +-------------------+             |
+-----------------------------------------------------------------------------------+
```

### 3.1 Sticky Glass Header (Navigation Bar)
*   **Ergonomics**: Sticky (`top-0`), absolute depth layer (`z-50`). Height is locked at `76px`.
*   **Initial State**: Fully transparent with a thin translucent underline.
*   **Scrolled State (>30px)**: Transitions into a dark glassmorphic layout (`backdrop-filter: blur(20px)`), with a subtle violet box-shadow pulse reflecting on scroll.
*   **User Widget**: Right-hand widget showcases the active user profile, flashing glowing emerald borders if the user holds an `ADMIN` or `EXPERT` rank.

### 3.2 Immersive Movie Cards
*   **Aspect Ratio**: `2 / 3` (portrait cinematic standard).
*   **Transitions**: Card cover zooms slightly (`scale(1.06)`) on hover, while a vibrant brand shadow (`box-shadow: 0 10px 30px rgba(138, 43, 226, 0.45)`) expands smoothly.
*   **Action Floating Badge**: Displays the `Global Tier` rating (S, A, B...) in a glowing gold badge floating on the upper-right corner.

---

## 4. Premium Ergonomics: Custom HLS Player & Active Seek Controls

Rather than a basic player wrapper, we deploy a highly integrated, custom UI control overlay that is fully responsive across tablet and desktop aspect ratios.

```text
+---------------------------------------------------------------------------+
|                          [ Custom HLS Player Container ]                   |
|                                                                           |
|   (⏪ Quay Lại 10s)         [ ⏺ Đang Tải Phân Đoạn HLS ]       (⏩ Tiến 10s)    |
|                                                                           |
| +-----------------------------------------------------------------------+ |
| | [===|================================================================] | |  <-- Crimson Progress Bar
| +-----------------------------------------------------------------------+ |
| | [▶]  [🔈 Volume ==|==]   12:35 / 24:00   [⏩ SKIP OP]   [⚙️ 1080p]  [⛶] | |  <-- Floating Controls
| +-----------------------------------------------------------------------+ |
+---------------------------------------------------------------------------+
```

### 4.1 Floating Controls Ergonomics
*   **Idle Autohide**: Controls bar smoothly slides down out of view after **3 seconds** of mouse inactivity. Moves back up immediately on hover.
*   **Progress Scrub track**: An active horizontal timeline track using `var(--brand-crimson)` for filled seeking state, with an expanded hover radius and a floating micro-tooltip showing target seek time on cursor position.
*   **Active Skip OP/ED Buttons**: Floating dark glass buttons (`Bỏ qua Intro` & `Bỏ qua Outro`) trigger instantly if the player's current frame matches specified metadata markers, sliding in from the right edge.
*   **Auto-Resume Alert Box**: Integrates a client-side progress tracker. If a user previously watched an episode up to `15:30`, entering the page triggers a bottom-left sliding glass box reading: *"Chào mừng trở lại! Tiếp tục xem từ 15:30? [Đồng Ý]"*.

---

## 5. Drag-and-Drop Tier-List Board

The Bảng Xếp Hạng Tier List utilizes a grid alignment model mapped across 6 absolute tiers (**S, A, B, C, D, F**).

### 5.1 Ergonomic Visual Styling
*   **Row Height**: Set to `min-h-[100px]` with flexible height wrapping.
*   **Row Badges**: Mapped with high-contrast glowing neon profiles:
    *   **S-Tier (Thần Thoại)**: Deep Gradient Violet/Cyan (`#8a2be2` -> `#00f2fe`) with an animated glowing pulse.
    *   **A-Tier (Tuyệt Thế)**: Vivid Warm Crimson (`#ff004f`).
    *   **B-Tier (Kiệt Xuất)**: Golden Amber (`#f5a623`).
    *   **C-Tier (Tinh Anh)**: Emerald Cyan (`#00f5d4`).
    *   **D-Tier (Bình Thường)**: Slate Muted Gray (`#64748b`).
    *   **F-Tier (Phế Vật)**: Dusty Charcoal Carbon (`#334155`).
*   **Interactive Placement Panel**: A bottom dashboard containing unranked movies, enabling users to drag items directly into their respective rows with smooth kinetic bounce effects.

---

## 6. Real-time Transcoding Console (SSE Visualizer)

For administrator uploads, a custom terminal container renders live transcoding telemetry:

*   **Pulsing Ring Console**: Circular progress bar using SVG stroke dashes, changing color from red to neon cyan as percent approaches `100%`.
*   **Dynamic Logs Terminal**: Consoles logs slide upward with subtle text glowing effects.
*   **Interactive Statistics Overlay**: Showcases Frame rate (`FPS`), Bitrate (`kbps`), and Remaining duration (`ETA`).

---

## 7. Skeleton Shimmer & Page Transitions

To elevate perceived loading speeds, all pages utilize absolute viewport transition delays and shimmering layout skeletons.

*   **Slide Page Transition**: Changing routes triggers a full-page smooth slide-in/slide-out effect with a bezier easing `cubic-bezier(0.76, 0, 0.24, 1)`.
*   **Active Skeleton Card Grid**: Instead of spinning loaders, empty cards fade in with a 45-degree angle shimmering gradient moving from left to right endlessly (`animation: skeleton-shimmer 1.6s infinite`).
