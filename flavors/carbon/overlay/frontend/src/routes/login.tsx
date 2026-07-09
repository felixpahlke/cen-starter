// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Button, Link as CarbonLink, Form, PasswordInput, Stack, TextInput } from "@carbon/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Navigate, Link as RouterLink, useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { signIn, useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";

const LoginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

type LoginValues = z.infer<typeof LoginSchema>;

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const session = useSession();
  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (session.data) {
    return <Navigate to="/" />;
  }

  async function onSubmit(values: LoginValues) {
    const result = await signIn.email(values);

    if (result.error) {
      toast.error(errorMessage(result.error, "Could not sign in"));
      return;
    }

    toast.success("Signed in");
    await navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="cds--type-heading-05">Sign in</h1>
          <p className="cds--type-body-01 text-text-secondary">
            Access CEN Starter with your email and password.
          </p>
        </div>
        <Form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap={6}>
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <TextInput
                  {...field}
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  labelText="Email"
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <PasswordInput
                  {...field}
                  id="login-password"
                  autoComplete="current-password"
                  labelText="Password"
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Button
              type="submit"
              className="w-full max-w-none justify-center"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </Stack>
        </Form>
        <p className="cds--type-body-01 text-center text-text-secondary">
          Need an account?{" "}
          <CarbonLink as={RouterLink} to="/signup" inline>
            Sign up
          </CarbonLink>
        </p>
      </section>
    </main>
  );
}
