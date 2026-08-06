// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Button } from "@carbon/react";
import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
});

function Dashboard() {
  const session = useSession();
  const name = session.data?.user.name ?? "there";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="space-y-2">
        <p className="cds--type-body-compact-01 text-text-secondary">Welcome, {name}</p>
        <h1 className="cds--type-heading-04">Add your first resource</h1>
        <p className="cds--type-body-01 text-text-secondary">
          Tell your AI agent what to build in one sentence:
        </p>
      </div>
      <blockquote className="cds--type-body-01 border-border-subtle-01 border-l-2 pl-4 italic">
        “Add projects. A project has a name and an optional description, belongs to the signed-in
        user, and gets a page in the sidebar.”
      </blockquote>
      <p className="cds--type-body-compact-01 text-text-secondary">
        The agent handles the schema, migration, API, and page. Prefer doing it by hand? Follow{" "}
        <code>docs/add-a-feature.md</code>.
      </p>
      {/* The backend serves Swagger UI only outside production. */}
      {import.meta.env.DEV && (
        <div>
          <Button kind="tertiary" size="sm" href="/api/docs">
            API docs
          </Button>
        </div>
      )}
    </div>
  );
}
