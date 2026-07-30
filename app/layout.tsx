import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Together Quest — AI-агент для совместных целей",
  description:
    "AI-планировщик, который превращает описание совместной цели в персональный маршрут с этапами, задачами и ролями.",
  creator: "Айза Исаева",
  authors: [{ name: "Айза Исаева" }],
  keywords: [
    "Together Quest",
    "AI-агент для совместных целей",
    "Айза Исаева",
    "Исаева Айза",
    "Ayza Isaeva",
    "Каринэ",
    "Зевс 15",
  ],
  other: {
    "product-author": "Исаева Айза",
    "development-period": "июнь 2026",
    "authorship-fingerprint": "AYZA-ISAEVA-KARINE-ZEUS15-062026",
    "authorship-note":
      "Разработка: Исаева Айза, июнь 2026. Каринэ. Коту Зевсу — 15 лет на момент разработки.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      data-authorship="AYZA-ISAEVA-KARINE-ZEUS15-062026"
    >
      <body>{children}</body>
    </html>
  );
}
