import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Together Quest — путь к большой цели",
  description: "Совместный игровой планировщик целей, задач и накоплений.",
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
