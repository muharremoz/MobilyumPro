import { AppNav } from "@/components/nav/app-nav";
import { AppHeader } from "@/components/nav/app-header";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-svh overflow-hidden bg-background">
      <AppNav />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card">
        <AppHeader />
        <div className="flex-1 overflow-auto p-3">
          {children}
        </div>
      </main>
    </div>
  );
}
