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
  metadataBase: new URL('https://donghua3d.me'),
  title: "Donghua3D - Đỉnh Cao Hoạt Hình 3D Trung Quốc | Tier List & BXH",
  description: "Khám phá thế giới phim hoạt hình 3D Trung Quốc (Donghua) chất lượng cao. Theo dõi bảng xếp hạng Tier List cộng đồng, đánh giá xác thực và trải nghiệm nghe nhìn tuyệt vời.",
  keywords: ["donghua", "donghua3d", "hoạt hình 3d trung quốc", "hoạt hình trung quốc", "phim hoạt hình 3d"],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://donghua3d.me',
    siteName: 'Donghua3D',
    title: 'Donghua3D - Đỉnh Cao Hoạt Hình 3D Trung Quốc | Tier List & BXH',
    description: 'Khám phá thế giới phim hoạt hình 3D Trung Quốc (Donghua) chất lượng cao. Đánh giá xác thực và trải nghiệm đỉnh cao.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Donghua3D - Đỉnh Cao Hoạt Hình 3D Trung Quốc',
    description: 'Khám phá thế giới phim hoạt hình 3D Trung Quốc (Donghua) chất lượng cao.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Donghua3D",
              "url": "https://donghua3d.me",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://donghua3d.me/?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
