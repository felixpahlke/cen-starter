import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
        <h1 className="font-semibold text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Account details for the current user.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current user</CardTitle>
            <CardDescription>Session identity returned by Better Auth.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Name" value={user?.name ?? ""} />
            <Separator />
            <InfoRow label="Email" value={user?.email ?? ""} />
            <Separator />
            <InfoRow label="Role" value={user?.role === "admin" ? "admin" : "user"} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change name</CardTitle>
              <CardDescription>Update the display name attached to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...nameForm}>
                <form onSubmit={nameForm.handleSubmit(updateName)} className="space-y-4">
                  <FormField
                    control={nameForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={nameForm.formState.isSubmitting}>
                    Save name
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Set a new password for email sign-in.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(updatePassword)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                    Save password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <div className="font-medium text-muted-foreground text-sm">{label}</div>
      <div className="break-words text-sm">{value || "Not set"}</div>
    </div>
  );
}
