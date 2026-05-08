```text
██████╗  ██████╗ ███╗   ██╗ ██████╗ ██╗  ██╗██╗   ██╗ █████╗ ██████╗ ██████╗ 
██╔══██╗██╔═══██╗████╗  ██║██╔════╝ ██║  ██║██║   ██║██╔══██╗╚════██╗██╔══██╗
██║  ██║██║   ██║██╔██╗ ██║██║  ███╗███████║██║   ██║███████║ █████╔╝██║  ██║
██║  ██║██║   ██║██║╚██╗██║██║   ██║██╔══██║██║   ██║██╔══██║ ╚═══██╗██║  ██║
██████╔╝╚██████╔╝██║ ╚████║╚██████╔╝██║  ██║╚██████╔╝██║  ██║██████╔╝██████╔╝
╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═════╝ 
```

# 🎬 Donghua3D Monorepo

[![Status](https://img.shields.io/badge/trạng_thái-lên_kế_hoạch-45f3ff?style=for-the-badge&logo=codeforces)](https://github.com/iamnguyenvu/donghua3d-monorepo.git)
[![Docker](https://img.shields.io/badge/Docker-khả_dụng-e50914?style=for-the-badge&logo=docker)](https://github.com/iamnguyenvu/donghua3d-monorepo.git)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-00e5ff?style=for-the-badge&logo=prisma)](https://github.com/iamnguyenvu/donghua3d-monorepo.git)
[![PostgreSQL](https://img.shields.io/badge/Cơ_sở_dữ_liệu-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://github.com/iamnguyenvu/donghua3d-monorepo.git)

Nền tảng streaming video chất lượng cao, tối ưu hóa chi phí vận hành và đạt tiêu chuẩn doanh nghiệp thiết kế riêng cho các bộ phim hoạt hình 3D Trung Quốc (Donghua). Hệ thống được kỹ thuật hóa từ **Nguyên lý gốc (First-Principles)** nhằm mang lại trải nghiệm phát video HLS không độ trễ, bảng xếp hạng Tier List tương tác kéo-thả, hệ thống đánh giá chống spam và các luồng bình luận đa cấp.

> 🌐 **Địa chỉ Repo GitHub**: [https://github.com/iamnguyenvu/donghua3d-monorepo.git](https://github.com/iamnguyenvu/donghua3d-monorepo.git)  
> 🌍 **Bản Tiếng Anh**: Xem tại file [README.md](file:///d:/Download/Project/donghua3d/README.md) để đọc tài liệu gốc bằng tiếng Anh.

---

## 💎 Các Tính Năng Đắt Giá Của Nền Tảng

* **🎥 Phát Video HLS Đỉnh Cao ($T_{segment} = 8s$)**: Khởi chạy video tức thì và tua phim mượt mà dưới 1 giây nhờ trình phát Custom Player cao cấp bọc quanh thư viện `hls.js`.
* **⚙️ Tiến Trình Mã Hóa Khóa Mutex**: Hàng đợi xử lý bất đồng bộ tự động cắt nhỏ file MP4 gốc thành các thư mục phân đoạn HLS đạt chuẩn keyframe-aligned, giới hạn chạy duy nhất 1 tiến trình tại một thời điểm để bảo vệ tài nguyên máy chủ.
* **🛡️ Bộ Lọc Đánh Giá Chống Spam Kép**: Thuật toán tính điểm trung bình dựa trên trọng số điểm uy tín (reputation score) của tài khoản, cô lập các tài khoản clone dưới 7 ngày tuổi để chặn review-bombing.
* **📊 Bảng Xếp Hạng Tier List Kéo-Thả**: Giao diện mờ kính (glassmorphic) vô cùng mượt mà cho phép người xem tự tay sắp xếp các bộ phim yêu thích vào các hàng (S, A, B, C, D, F) kèm ghi chú cá nhân.
* **💬 Bình Luận Che Mờ Nội Dung Spoil**: Luồng bình luận đa cấp tương tác cao, tự động áp bộ lọc CSS làm mờ (Blur) các nội dung spoil cốt truyện cho đến khi người xem chủ động nhấp chuột vào để hiển thị.
* **💾 Xem Tiếp Tự Động & Bỏ Qua Intro**: Tự động lưu lịch sử giây đang xem dở về DB cứ mỗi 10 giây và hiển thị nút bấm nổi cho phép bỏ qua nhanh nhạc dạo đầu phim (OP/ED).

---

## 🛠️ Cấu Trúc Monorepo Thống Nhất

Dự án này được tổ chức dưới dạng một **TypeScript Monorepo**, đảm bảo dùng chung kiểu dữ liệu và vận hành Docker đồng bộ.

```text
donghua3d-monorepo/
├── docs/                             # Tài liệu Đặc tả Chuẩn Claude SDD
│   ├── 01_system_spec.md             # Phạm vi hệ thống, bounded contexts, threat model
│   ├── 02_data_spec.md               # Schema DDL PostgreSQL, compound indices, thuật toán điểm
│   ├── 03_api_spec.md                # Danh sách API routes, JSON payloads, định dạng SSE stream
│   ├── 04_ui_ux_spec.md              # Cinematic design tokens, custom player, bảng tier list
│   ├── 05_ops_spec.md                # Dockerfiles, Nginx cache, cấu hình S3 OAC, 4 phase scaling
│   ├── 06_implementation_plan.md     # Kế hoạch code từng bước kèm điều kiện verify kiểm thử
│   ├── 07_conventions_spec.md        # Quy chuẩn viết code, commit git, chuẩn đặt tên API & CSS
│   ├── 08_audit_report.md            # Báo cáo rà soát và đánh giá mã nguồn ban đầu
│   ├── 09_current_system_report.md   # Báo cáo hiện trạng hệ thống & kiểm toán giao diện thực tế
│   ├── 10_phase2_implementation.md   # Kế hoạch chi tiết triển khai Giai đoạn 2 (Vidstack, R2, Sockets)
│   ├── 11_video_sources_audit.md     # Phân tích chuyên sâu nguồn video (hoathinh3d & hh3d, Proxy CDN)
│   └── 12_premium_4k_architecture.md # Thiết kế kiến trúc chuyển tiếp video lai chất lượng cao 4K
├── nginx/                            # Cấu hình Reverse Proxy Nginx
│   └── nginx.conf                    # CORS headers, chính sách microcaching, tối ưu hóa phát file
├── backend/                          # Mã nguồn API Server (Express.js & TypeScript)
│   ├── src/                          # Controllers, middleware, services, router
│   ├── prisma/                       # Cấu hình Prisma schema, migrations, seed script
│   └── Dockerfile                    # Container hóa multi-stage tích hợp sẵn FFmpeg
├── frontend/                         # Mã nguồn Web Client (Next.js & App Router)
│   ├── src/                          # Các trang, component tương tác cao cấp, CSS
│   └── Dockerfile                    # Container hóa Next.js standalone tối ưu dung lượng
├── docker-compose.yml                # Điều phối container db, api, ui và reverse proxy
├── .env.example                      # File khuôn mẫu cấu hình môi trường
└── README.md                         # Tổng quan dự án bằng tiếng Anh
```

---

## ⚙️ Yêu Cầu & Cài Đặt Khởi Chạy Nhanh

Trước khi bắt đầu, hãy đảm bảo máy phát triển cục bộ của bạn đáp ứng các điều kiện tiên quyết sau:
- **Node.js**: `v20.x` hoặc `v22.x` (Bản LTS)
- **Docker & Docker Desktop**: Đã cài đặt và đang chạy ổn định
- **FFmpeg**: Đã cài đặt cục bộ và thêm vào biến Path hệ thống (không bắt buộc, để phục vụ chạy test nhanh ngoài container)

### 1. Nhân bản dự án từ GitHub
```bash
git clone https://github.com/iamnguyenvu/donghua3d-monorepo.git
cd donghua3d-monorepo
```

### 2. Thiết lập file cấu hình môi trường
Sao chép file khuôn mẫu và điều chỉnh các mật khẩu/khóa:
```bash
cp .env.example .env
```

### 3. Build và khởi động toàn bộ hệ thống
Để khởi tạo các microservices và đồng loạt khởi chạy Postgres, Express, Next.js standalone, và Nginx proxy:
```bash
docker compose up -d --build
```
*Sau khi các container chạy thành công, bạn có thể truy cập website ngay tại [http://localhost](http://localhost) (đã được định tuyến qua cổng 80 của Nginx Reverse Proxy).*

### 4. Đồng bộ Cơ sở Dữ liệu (Bên trong Container API)
Khởi chạy tạo bảng tự động và nạp bộ dữ liệu mẫu (Seeding):
```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npx prisma db seed
```

---

## 📑 Các File Tài Liệu Đặc Tả Chi Tiết (Claude SDD)

Hệ thống được thiết kế hoàn thiện trước khi tiến hành code. Để rà soát chi tiết, hãy đọc bộ tài liệu đặc tả cốt lõi tại đây:

* 📄 **[01_Đặc tả Hệ thống](file:///d:/Download/Project/donghua3d/docs/01_system_spec.md)**: Tổng quan hệ thống, stack công nghệ, bounded contexts, sơ đồ kiến trúc và use case.
* 📄 **[02_Đặc tả Cơ sở Dữ liệu](file:///d:/Download/Project/donghua3d/docs/02_data_spec.md)**: Hệ thống bảng PostgreSQL DDL, composite indexes và công thức toán học tính điểm.
* 📄 **[03_Đặc tả Giao diện API](file:///d:/Download/Project/donghua3d/docs/03_api_spec.md)**: Danh sách chi tiết API routes, JSON payloads và cấu trúc SSE stream telemetry.
* 📄 **[04_Đặc tả Giao diện UI/UX](file:///d:/Download/Project/donghua3d/docs/04_ui_ux_spec.md)**: Giao diện trình phát Custom Player, kéo thả Tier List, mờ spoil và loader.
* 📄 **[05_Đặc tả Ops & Caching](file:///d:/Download/Project/donghua3d/docs/05_ops_spec.md)**: Đóng gói Docker multi-stage, chính sách cache Nginx và hạ tầng AWS CloudFront S3.
* 📄 **[06_Kế hoạch Triển khai](file:///d:/Download/Project/donghua3d/docs/06_implementation_plan.md)**: Danh sách tác vụ lập trình tuần tự kèm điều kiện xác nhận thành công.
* 📄 **[07_Quy chuẩn Dự án](file:///d:/Download/Project/donghua3d/docs/07_conventions_spec.md)**: Quy tắc gõ code TypeScript, đặt tên biến, BEM CSS, và cú pháp commit Git.
* 📄 **[08_Báo cáo Kiểm toán Mã nguồn](file:///d:/Download/Project/donghua3d/docs/08_audit_report.md)**: Kết quả đánh giá chất lượng mã nguồn ban đầu của monorepo.
* 📄 **[09_Báo cáo Hiện trạng Hệ thống](file:///d:/Download/Project/donghua3d/docs/09_current_system_report.md)**: Tổng hợp hệ thống sau Giai đoạn 1 và khắc phục lỗi giao diện.
* 📄 **[10_Kế hoạch Giai đoạn 2](file:///d:/Download/Project/donghua3d/docs/10_phase2_implementation_plan.md)**: Lộ trình triển khai nâng cấp Vidstack Player, Cloudflare R2, WebSockets.
* 📄 **[11_Phân tích Nguồn Video](file:///d:/Download/Project/donghua3d/docs/11_video_sources_audit.md)**: Nghiên cứu chuyên sâu giao thức HLS, CDN Proxy của hoathinh3d & hh3d.
* 📄 **[12_Kiến trúc 4K Premium](file:///d:/Download/Project/donghua3d/docs/12_premium_4k_architecture.md)**: Thiết kế giải pháp chuyển tiếp video lai chất lượng cao và chống leech 4K.

---

## 🤝 Quy Chuẩn Viết Code & Đóng Góp

Tất cả các đóng góp mã nguồn bắt buộc phải tuân thủ nghiêm ngặt các quy tắc quy định tại **[07_Quy chuẩn Dự án](file:///d:/Download/Project/donghua3d/docs/07_conventions_spec.md)**.

### Quy tắc đặt thông điệp Commit Git
Thông điệp commit bắt buộc tuân theo định dạng Angular Semantic Standard:
`feat(scope): mô tả ngắn bằng chữ thường`

Các từ khóa được chấp nhận: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `chore`.
