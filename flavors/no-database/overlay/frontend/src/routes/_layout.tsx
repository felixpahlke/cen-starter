// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Home, type LucideIcon } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

type AppRoute = "/";

type NavItem = {
  to: AppRoute;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [{ to: "/", label: "Dashboard", icon: Home }];

export const Route = createFileRoute("/_layout")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-card text-card-foreground md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="font-semibold text-lg tracking-tight">
            CEN Starter
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLinks items={navItems} />
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex min-h-16 flex-wrap items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <Link to="/" className="font-semibold text-lg tracking-tight md:hidden">
            CEN Starter
          </Link>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto md:hidden">
            <NavLinks items={navItems} compact />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavLinks({ items, compact = false }: { items: NavItem[]; compact?: boolean }) {
  return items.map((item) => {
    const Icon = item.icon;

    return (
      <Link
        key={item.to}
        to={item.to}
        activeProps={{ className: "bg-accent text-accent-foreground" }}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md px-3 font-medium text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          compact ? "shrink-0" : "w-full justify-start",
        )}
      >
        <Icon className="size-4" />
        <span>{item.label}</span>
      </Link>
    );
  });
}
