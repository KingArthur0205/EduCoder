import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduCoder",
  description: "Educational transcript tagging and annotation tool",
  other: {
    'Content-Language': 'en'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
