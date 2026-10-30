import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Suspense } from "react";
import { AppHeader, AppHeaderFallback } from "@/app/components/header/app-header";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["200", "400", "500"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Forest Management",
  description: "Forest Management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Suspense fallback={<AppHeaderFallback />}>
          <AppHeader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
