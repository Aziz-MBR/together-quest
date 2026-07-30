import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Together Quest — AI-агент для совместных целей",
  description:
    "AI-планировщик, который превращает описание совместной цели в персональный маршрут с этапами, задачами и ролями.",
  creator: "Айза Исаева",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
