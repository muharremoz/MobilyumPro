import { AppNav } from "@/components/nav/app-nav";
import { AppHeader } from "@/components/nav/app-header";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-svh overflow-hidden bg-background p-2.5">
      <AppNav />
      <main className="ml-2.5 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border bg-card shadow-sm">
        <AppHeader />
        <div className="flex-1 overflow-auto p-3">
          {children}
        </div>
      </main>
    </div>
  );
}
