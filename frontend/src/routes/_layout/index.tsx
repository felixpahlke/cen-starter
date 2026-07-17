import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
});

function Dashboard() {
  const session = useSession();
  const name = session.data?.user.name ?? "there";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Welcome, {name}</h1>
        <p className="text-muted-foreground">
          CEN Starter is ready for authenticated product work.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>This is the template</CardTitle>
          <CardDescription>
            The app shell, auth flow, typed API client, and CRUD resource are wired together.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/items">
              <Package />
              Open items
              <ArrowRight />
            </Link>
          </Button>
          {/* The backend serves Swagger UI only outside production. */}
          {import.meta.env.DEV && (
            <Button asChild variant="outline">
              <a href="/api/docs">
                <BookOpen />
                Swagger UI
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
