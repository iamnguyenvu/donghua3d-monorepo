import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Donghua3D - Đỉnh Cao Hoạt Hình 3D Trung Quốc | Tier List & BXH",
  description: "Khám phá thế giới phim hoạt hình 3D Trung Quốc (Donghua) chất lượng cao. Theo dõi bảng xếp hạng Tier List cộng đồng, đánh giá xác thực và trải nghiệm nghe nhìn tuyệt vời.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
