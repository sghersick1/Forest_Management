import { Suspense } from "react";
import { AppHeader, AppHeaderFallback } from "@/app/components/header/app-header";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<AppHeaderFallback />}>
        <AppHeader />
      </Suspense>
      {children}
    </>
  );
}
