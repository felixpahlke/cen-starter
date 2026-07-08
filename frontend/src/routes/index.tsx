import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.health.$get()).json(),
  });

  return (
    <main className="flex min-h-svh items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-card-foreground">
        <div className="space-y-2">
          <h1 className="font-semibold text-2xl tracking-tight">CEN-APP</h1>
          <p className="text-muted-foreground text-sm">
            {health.data?.status === "ok"
              ? "API connected. You're ready to build."
              : "Waiting for the API…"}
          </p>
        </div>
        <Button asChild>
          <a href="/api/docs">Open API docs</a>
        </Button>
      </div>
    </main>
  );
}
