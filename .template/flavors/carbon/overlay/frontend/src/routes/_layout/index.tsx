// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Api, ArrowRight } from "@carbon/icons-react";
import { ClickableTile, Tile } from "@carbon/react";
import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
});

function Dashboard() {
  const session = useSession();
  const name = session.data?.user.name ?? "there";

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="cds--type-heading-05">Welcome, {name}</h1>
        <p className="cds--type-body-01 text-text-secondary">
          CEN Starter is ready for authenticated product work.
        </p>
      </div>
      <div className="grid max-w-4xl gap-4 sm:grid-cols-2">
        <Tile className="min-h-40">
          <div className="flex h-full flex-col gap-4">
            <div className="space-y-2">
              <h2 className="cds--type-heading-03">Add your first resource</h2>
              <p className="cds--type-body-01 text-text-secondary">
                The shell, sign-in, and typed API chain are wired — your domain is what&apos;s
                missing. Tell your agent:
              </p>
            </div>
            <p className="cds--type-body-01 border-border-subtle-01 border-l-2 pl-4">
              Add projects. A project has a name and an optional description, belongs to the
              signed-in user, and gets a page in the sidebar.
            </p>
          </div>
        </Tile>
        {/* The backend serves Swagger UI only outside production. */}
        {import.meta.env.DEV && (
          <ClickableTile href="/api/docs" renderIcon={ArrowRight} className="min-h-40">
            <div className="flex h-full flex-col justify-between gap-6">
              <Api size={20} />
              <div className="space-y-2">
                <h2 className="cds--type-heading-03">API docs</h2>
                <p className="cds--type-body-01 text-text-secondary">View the OpenAPI reference.</p>
              </div>
            </div>
          </ClickableTile>
        )}
      </div>
    </div>
  );
}
