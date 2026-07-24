import { createFileRoute, Link, Navigate, Outlet, useRouter } from "@tanstack/react-router";
import { Home, LogOut, type LucideIcon, Package, Settings, Shield } from "lucide-react";
import { toast } from "sonner";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut, useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type AppRoute = "/" | "/items" | "/settings" | "/admin";

type NavItem = {
  to: AppRoute;
  label: string;
  icon: LucideIcon;
  admin?: boolean;
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/items", label: "Items", icon: Package },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/admin", label: "Admin", icon: Shield, admin: true },
];

export const Route = createFileRoute("/_layout")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const router = useRouter();
  const session = useSession();

  if (session.isPending) {
    return <ProtectedLayoutSkeleton />;
  }

  if (!session.data) {
    return <Navigate to="/login" />;
  }

  const user = session.data.user;
  const visibleItems = navItems.filter((item) => !item.admin || user.role === "admin");

  async function handleSignOut() {
    const result = await signOut();

    if (result.error) {
      toast.error(errorMessage(result.error, "Could not sign out"));
      return;
    }

    toast.success("Signed out");
    await router.navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-card text-card-foreground md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="font-semibold text-lg tracking-tight">
            CEN Starter
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLinks items={visibleItems} />
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex min-h-16 flex-wrap items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <Link to="/" className="font-semibold text-lg tracking-tight md:hidden">
            CEN Starter
          </Link>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto md:hidden">
            <NavLinks items={visibleItems} compact />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
            <UserMenu
              name={user.name}
              email={user.email}
              image={user.image ?? null}
              onSignOut={handleSignOut}
            />
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
  image,
  onSignOut,
}: {
  name: string;
  email: string;
  image?: string | null;
  onSignOut: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <Avatar className="size-8">
            <AvatarImage src={image ?? undefined} alt={name} />
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
        <DropdownMenuItem onSelect={() => void onSignOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

function ProtectedLayoutSkeleton() {
  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="flex h-16 items-center border-b px-6">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-2 p-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
          <Skeleton className="h-5 w-28 md:hidden" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="size-9" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </header>
        <main className="space-y-6 p-4 md:p-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </main>
      </div>
    </div>
  );
}
