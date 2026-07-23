import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
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
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access CEN Starter with your email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                Sign in
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-muted-foreground text-sm">
            Need an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
