// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Button, Link as CarbonLink, Form, PasswordInput, Stack, TextInput } from "@carbon/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Navigate, Link as RouterLink, useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { signUp, useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";

const SignupSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

type SignupValues = z.infer<typeof SignupSchema>;

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const session = useSession();
  const form = useForm<SignupValues>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  if (session.data) {
    return <Navigate to="/" />;
  }

  async function onSubmit(values: SignupValues) {
    const result = await signUp.email(values);

    if (result.error) {
      toast.error(errorMessage(result.error, "Could not create account"));
      return;
    }

    toast.success("Account created");
    await navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="cds--type-heading-05">Create account</h1>
          <p className="cds--type-body-01 text-text-secondary">
            Use an email and password to start with CEN Starter.
          </p>
        </div>
        <Form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap={6}>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextInput
                  {...field}
                  id="signup-name"
                  autoComplete="name"
                  labelText="Name"
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <TextInput
                  {...field}
                  id="signup-email"
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
                  id="signup-password"
                  autoComplete="new-password"
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
              {form.formState.isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </Stack>
        </Form>
        <p className="cds--type-body-01 text-center text-text-secondary">
          Already have an account?{" "}
          <CarbonLink as={RouterLink} to="/login" inline>
            Sign in
          </CarbonLink>
        </p>
      </section>
    </main>
  );
}
