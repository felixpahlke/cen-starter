import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
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
          <CardTitle>Add your first resource</CardTitle>
          <CardDescription>
            The app shell, sign-in, and typed API chain are wired. What&apos;s missing is your
            domain — the first real resource replaces this card.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="rounded-lg border bg-muted/50 p-4 font-mono text-sm">
            Add projects. A project has a name and an optional description, belongs to the signed-in
            user, and gets a page in the sidebar.
          </p>
          <p className="text-muted-foreground text-sm">
            Tell your agent something like this — the add-resource skill handles the rest, from
            database migration to sidebar page. Prefer doing it by hand? Follow{" "}
            <code>docs/add-a-feature.md</code>.
          </p>
          {/* The backend serves Swagger UI only outside production. */}
          {import.meta.env.DEV && (
            <div>
              <Button asChild variant="outline">
                <a href="/api/docs">
                  <BookOpen />
                  Swagger UI
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
