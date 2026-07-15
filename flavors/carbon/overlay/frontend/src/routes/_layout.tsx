// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Asleep, Light, Logout, UserAvatar } from "@carbon/icons-react";
import {
  Button,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  HeaderPanel,
  Loading,
  Tag,
} from "@carbon/react";
import { createFileRoute, Link, Navigate, Outlet, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { signOut, useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";

type AppRoute = "/" | "/items" | "/settings" | "/admin";

type NavItem = {
  to: AppRoute;
  label: string;
  admin?: boolean;
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/items", label: "Items" },
  { to: "/settings", label: "Settings" },
  { to: "/admin", label: "Admin", admin: true },
];

export const Route = createFileRoute("/_layout")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const router = useRouter();
  const session = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [panelOpen, setPanelOpen] = useState(false);

  if (session.isPending) {
    return <Loading withOverlay description="Loading session" />;
  }

  if (!session.data) {
    return <Navigate to="/login" />;
  }

  const user = session.data.user;
  const visibleItems = navItems.filter((item) => !item.admin || user.role === "admin");
  const dark = resolvedTheme === "dark";

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
    <div className="min-h-dvh">
      <Header aria-label="CEN Starter">
        <HeaderName as={Link} to="/" prefix="CEN">
          Starter
        </HeaderName>
        <HeaderNavigation aria-label="Main navigation">
          {visibleItems.map((item) => (
            <HeaderMenuItem key={item.to} as={Link} to={item.to}>
              {item.label}
            </HeaderMenuItem>
          ))}
        </HeaderNavigation>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(dark ? "light" : "dark")}
          >
            {dark ? <Light size={20} /> : <Asleep size={20} />}
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label="Account"
            isActive={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
          >
            <UserAvatar size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
        <HeaderPanel aria-label="Account panel" expanded={panelOpen}>
          <div className="flex h-full flex-col gap-4 p-4">
            <div className="flex flex-col items-start gap-1">
              <p className="font-semibold text-sm">{user.name}</p>
              {user.email !== user.name && (
                <p className="text-sm text-text-secondary">{user.email}</p>
              )}
              {user.role === "admin" && (
                <Tag type="purple" className="self-start">
                  admin
                </Tag>
              )}
            </div>
            <div className="border-border-subtle-01 border-t pt-4">
              <Button kind="ghost" size="sm" renderIcon={Logout} onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </HeaderPanel>
      </Header>
      <main className="mx-auto w-full max-w-[99rem] px-4 pt-20 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
