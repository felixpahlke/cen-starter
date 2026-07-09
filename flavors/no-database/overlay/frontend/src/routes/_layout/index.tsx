// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Welcome</h1>
        <p className="text-muted-foreground">CEN-APP is ready for product work.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>This is the no-database template</CardTitle>
          <CardDescription>
            The app shell and typed health API are wired without local persistence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/docs">
              <BookOpen />
              Swagger UI
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
