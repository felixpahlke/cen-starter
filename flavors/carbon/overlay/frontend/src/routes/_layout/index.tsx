// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Api, ArrowRight, Package } from "@carbon/icons-react";
import { ClickableTile } from "@carbon/react";
import { createFileRoute } from "@tanstack/react-router";
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
        <h1 className="cds--type-heading-05">Welcome, {name}</h1>
        <p className="cds--type-body-01 text-text-secondary">
          CEN Starter is ready for authenticated product work.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ClickableTile href="/items" renderIcon={ArrowRight} className="min-h-40">
          <div className="flex h-full flex-col justify-between gap-6">
            <Package size={20} />
            <div className="space-y-2">
              <h2 className="cds--type-heading-03">Items</h2>
              <p className="cds--type-body-01 text-text-secondary">Open the CRUD resource.</p>
            </div>
          </div>
        </ClickableTile>
        <ClickableTile href="/api/docs" renderIcon={ArrowRight} className="min-h-40">
          <div className="flex h-full flex-col justify-between gap-6">
            <Api size={20} />
            <div className="space-y-2">
              <h2 className="cds--type-heading-03">API docs</h2>
              <p className="cds--type-body-01 text-text-secondary">View the OpenAPI reference.</p>
            </div>
          </div>
        </ClickableTile>
      </div>
    </div>
  );
}
