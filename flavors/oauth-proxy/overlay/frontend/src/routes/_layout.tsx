// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Home, LogOut, type LucideIcon, Package } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type AppRoute = "/" | "/items";

type NavItem = {
  to: AppRoute;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/items", label: "Items", icon: Package },
];

export const Route = createFileRoute("/_layout")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const session = useSession();

  if (session.isPending) {
    return (
      <AuthState
        title="Authenticating..."
        description="Waiting for oauth2-proxy to provide your identity."
      />
    );
  }

  if (!session.data) {
    return (
      <AuthState
        title="Not authenticated"
        description="Open the app through the proxy (port 4180)."
      />
    );
  }

  const user = session.data.user;

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-card text-card-foreground md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="font-semibold text-lg tracking-tight">
            CEN-APP
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLinks items={navItems} />
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex min-h-16 flex-wrap items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <Link to="/" className="font-semibold text-lg tracking-tight md:hidden">
            CEN-APP
          </Link>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto md:hidden">
            <NavLinks items={navItems} compact />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
            <UserMenu name={user.name} email={user.email} onSignOut={signOut} />
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

function UserMenu({
  name,
  email,
  onSignOut,
}: {
  name: string;
  email: string;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <Avatar className="size-8">
            <AvatarFallback>{initials(name, email)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm md:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-1">
          <div className="truncate font-medium">{name}</div>
          <div className="truncate font-normal text-muted-foreground text-xs">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
        <Link to="/" className="font-semibold text-lg tracking-tight">
          CEN-APP
        </Link>
        <ModeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-2 text-center">
          <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </main>
    </div>
  );
}

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}
