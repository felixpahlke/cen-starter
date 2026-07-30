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
      <h1 className="font-semibold text-3xl tracking-tight">Welcome, {name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Add your first resource</CardTitle>
          <CardDescription>Tell your AI agent what you need — for example:</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <blockquote className="border-primary border-l-2 pl-4 text-sm italic">
            “Add projects. A project has a name and an optional description, belongs to the
            signed-in user, and gets a page in the sidebar.”
          </blockquote>
          <p className="text-muted-foreground text-sm">
            One sentence like this is the whole feature request — the agent takes it from schema to
            migration to sidebar page. Prefer doing it by hand? Follow{" "}
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
