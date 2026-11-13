import type { Metadata } from "next";
import { Roboto } from "next/font/google";
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

// Kept out of the Tailwind CSS pipeline, which drops scrollbar pseudos.
const scrollbar = `
* {
  scrollbar-width: thin;
  scrollbar-color: var(--surface-header) transparent;
}
*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
*::-webkit-scrollbar-track {
  background: transparent;
}
*::-webkit-scrollbar-thumb {
  background-color: var(--surface-header);
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-secondary);
}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} h-full antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-y-auto">
        <style href="scrollbar">{scrollbar}</style>
        {children}
      </body>
    </html>
  );
}
