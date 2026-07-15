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
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { signOut, useSession } from "@/lib/auth";

type AppRoute = "/" | "/items";

type NavItem = {
  to: AppRoute;
  label: string;
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/items", label: "Items" },
];

export const Route = createFileRoute("/_layout")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const session = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [panelOpen, setPanelOpen] = useState(false);

  if (session.isPending) {
    return <Loading withOverlay description="Waiting for oauth2-proxy to provide your identity" />;
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
  const dark = resolvedTheme === "dark";

  return (
    <div className="min-h-dvh">
      <Header aria-label="CEN Starter">
        <HeaderName as={Link} to="/" prefix="CEN">
          Starter
        </HeaderName>
        <HeaderNavigation aria-label="Main navigation">
          {navItems.map((item) => (
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
              <Button kind="ghost" size="sm" renderIcon={Logout} onClick={signOut}>
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

function AuthState({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="text-text-secondary">{description}</p>
      </div>
    </main>
  );
}
