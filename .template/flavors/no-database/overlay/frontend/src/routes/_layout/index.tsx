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
      <h1 className="font-semibold text-3xl tracking-tight">Welcome</h1>
      <Card>
        <CardHeader>
          <CardTitle>Add your first page</CardTitle>
          <CardDescription>Tell your AI agent what you need — for example:</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <blockquote className="border-primary border-l-2 pl-4 text-sm italic">
            “Add a status page in the sidebar that calls a new /api/status endpoint and shows the
            result.”
          </blockquote>
          <div>
            <Button asChild variant="outline">
              <a href="/api/docs">
                <BookOpen />
                Swagger UI
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
