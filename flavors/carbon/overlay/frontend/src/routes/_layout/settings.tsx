// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Button, Form, PasswordInput, Stack, TextInput, Tile } from "@carbon/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient, useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";

const NameSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
});

const PasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});

type NameValues = z.infer<typeof NameSchema>;
type PasswordValues = z.infer<typeof PasswordSchema>;

export const Route = createFileRoute("/_layout/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const session = useSession();
  const user = session.data?.user;
  const nameForm = useForm<NameValues>({
    resolver: zodResolver(NameSchema),
    defaultValues: {
      name: user?.name ?? "",
    },
  });
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  useEffect(() => {
    if (user?.name) {
      nameForm.reset({ name: user.name });
    }
  }, [nameForm, user?.name]);

  async function updateName(values: NameValues) {
    const result = await authClient.updateUser(values);

    if (result.error) {
      toast.error(errorMessage(result.error, "Could not update name"));
      return;
    }

    await session.refetch();
    toast.success("Name updated");
  }

  async function updatePassword(values: PasswordValues) {
    const result = await authClient.changePassword({
      ...values,
      revokeOtherSessions: true,
    });

    if (result.error) {
      toast.error(errorMessage(result.error, "Could not update password"));
      return;
    }

    passwordForm.reset();
    toast.success("Password updated");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="cds--type-heading-05">Settings</h1>
        <p className="cds--type-body-01 text-text-secondary">
          Account details for the current user.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Tile>
          <Stack gap={6}>
            <div className="space-y-1">
              <h2 className="cds--type-heading-03">Current user</h2>
              <p className="cds--type-body-01 text-text-secondary">
                Session identity returned by Better Auth.
              </p>
            </div>
            <InfoRow label="Name" value={user?.name ?? ""} />
            <InfoRow label="Email" value={user?.email ?? ""} />
            <InfoRow label="Role" value={user?.role === "admin" ? "admin" : "user"} />
          </Stack>
        </Tile>
        <div className="space-y-6">
          <Tile>
            <Stack gap={6}>
              <div className="space-y-1">
                <h2 className="cds--type-heading-03">Change name</h2>
                <p className="cds--type-body-01 text-text-secondary">
                  Update the display name attached to your account.
                </p>
              </div>
              <Form onSubmit={nameForm.handleSubmit(updateName)}>
                <Stack gap={6}>
                  <Controller
                    control={nameForm.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <TextInput
                        {...field}
                        id="settings-name"
                        autoComplete="name"
                        labelText="Name"
                        invalid={!!fieldState.error}
                        invalidText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Button type="submit" disabled={nameForm.formState.isSubmitting}>
                    {nameForm.formState.isSubmitting ? "Saving..." : "Save name"}
                  </Button>
                </Stack>
              </Form>
            </Stack>
          </Tile>
          <Tile>
            <Stack gap={6}>
              <div className="space-y-1">
                <h2 className="cds--type-heading-03">Change password</h2>
                <p className="cds--type-body-01 text-text-secondary">
                  Set a new password for email sign-in.
                </p>
              </div>
              <Form onSubmit={passwordForm.handleSubmit(updatePassword)}>
                <Stack gap={6}>
                  <Controller
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field, fieldState }) => (
                      <PasswordInput
                        {...field}
                        id="settings-current-password"
                        autoComplete="current-password"
                        labelText="Current password"
                        invalid={!!fieldState.error}
                        invalidText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field, fieldState }) => (
                      <PasswordInput
                        {...field}
                        id="settings-new-password"
                        autoComplete="new-password"
                        labelText="New password"
                        invalid={!!fieldState.error}
                        invalidText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting ? "Saving..." : "Save password"}
                  </Button>
                </Stack>
              </Form>
            </Stack>
          </Tile>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 border-border-subtle-01 border-t pt-4">
      <div className="cds--type-label-01 text-text-secondary">{label}</div>
      <div className="cds--type-body-01 break-words">{value || "Not set"}</div>
    </div>
  );
}
