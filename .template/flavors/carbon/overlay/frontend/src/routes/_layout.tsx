// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Asleep, Light, Logout, Settings, UserAvatar } from "@carbon/icons-react";
import {
  Button,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  HeaderPanel,
  Loading,
  SideNav,
  SideNavItems,
  SideNavLink,
  Tag,
} from "@carbon/react";
import { createFileRoute, Link, Navigate, Outlet, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { toast } from "@/components/toaster";
import { signOut, useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";

type AppRoute = "/" | "/settings" | "/admin";

type NavItem = {
  to: AppRoute;
  label: string;
  admin?: boolean;
};

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/admin", label: "Admin", admin: true },
];

export const Route = createFileRoute("/_layout")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const router = useRouter();
  const session = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
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
        <HeaderMenuButton
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          isActive={menuOpen}
          onClick={() => {
            setPanelOpen(false);
            setMenuOpen((open) => !open);
          }}
        />
        <HeaderName as={Link} to="/" prefix="">
          CEN Starter
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
            onClick={() => {
              setMenuOpen(false);
              setPanelOpen((open) => !open);
            }}
          >
            <UserAvatar size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
        <SideNav aria-label="Side navigation" expanded={menuOpen} isPersistent={false}>
          <SideNavItems>
            {visibleItems.map((item) => (
              <SideNavLink key={item.to} as={Link} to={item.to} onClick={() => setMenuOpen(false)}>
                {item.label}
              </SideNavLink>
            ))}
          </SideNavItems>
        </SideNav>
        <HeaderPanel
          aria-label="Account panel"
          expanded={panelOpen}
          className="border-border-subtle-01 border-l"
        >
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
            <div className="flex flex-col items-start border-border-subtle-01 border-t pt-4">
              <Button
                kind="ghost"
                size="sm"
                renderIcon={Settings}
                onClick={() => {
                  setPanelOpen(false);
                  void router.navigate({ to: "/settings" });
                }}
              >
                Settings
              </Button>
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
