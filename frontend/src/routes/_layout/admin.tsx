import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient, useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const usersQueryKey = ["admin", "users"] as const;
const roleOptions = ["user", "admin"] as const;
const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40";

const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(roleOptions),
});

type CreateUserValues = z.infer<typeof CreateUserSchema>;
type UserRole = (typeof roleOptions)[number];
type UsersData = NonNullable<Awaited<ReturnType<typeof authClient.admin.listUsers>>["data"]>;
type AdminUser = UsersData["users"][number];

export const Route = createFileRoute("/_layout/admin")({
  component: AdminPage,
});

function AdminPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: listUsers,
    enabled: session.data?.user.role === "admin",
  });
  const setRoleMutation = useMutation({
    mutationFn: setUserRole,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey });
      toast.success("Role updated");
    },
    onError: (error) => toast.error(error.message),
  });
  const banMutation = useMutation({
    mutationFn: banUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey });
      toast.success("User banned");
    },
    onError: (error) => toast.error(error.message),
  });
  const unbanMutation = useMutation({
    mutationFn: unbanUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey });
      toast.success("User unbanned");
    },
    onError: (error) => toast.error(error.message),
  });

  if (session.isPending) {
    return <AdminSkeleton />;
  }

  if (session.data?.user.role !== "admin") {
    return <Navigate to="/" />;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-semibold text-3xl tracking-tight">Admin</h1>
          <p className="text-muted-foreground">
            User management from the Better Auth admin plugin.
          </p>
        </div>
        <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            List users, create accounts, change roles, and ban access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isPending ? <UserSkeletonRows /> : null}
              {usersQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-destructive">
                    {usersQuery.error.message}
                  </TableCell>
                </TableRow>
              ) : null}
              {usersQuery.data?.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : null}
              {usersQuery.data?.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{userRole(user)}</TableCell>
                  <TableCell>{user.banned ? "Banned" : "Active"}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                            <span className="sr-only">Open user actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={userRole(user) === "user" || setRoleMutation.isPending}
                            onSelect={() =>
                              setRoleMutation.mutate({ userId: user.id, role: "user" })
                            }
                          >
                            Make user
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={userRole(user) === "admin" || setRoleMutation.isPending}
                            onSelect={() =>
                              setRoleMutation.mutate({ userId: user.id, role: "admin" })
                            }
                          >
                            Make admin
                          </DropdownMenuItem>
                          {user.banned ? (
                            <DropdownMenuItem
                              disabled={unbanMutation.isPending}
                              onSelect={() => unbanMutation.mutate(user.id)}
                            >
                              Unban
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled={banMutation.isPending}
                              variant="destructive"
                              onSelect={() => banMutation.mutate(user.id)}
                            >
                              Ban
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey });
      form.reset();
      onOpenChange(false);
      toast.success("User created");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>Add an email/password user with a starting role.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
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
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <select className={cn(selectClassName)} {...field}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function UserSkeletonRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <TableRow key={index}>
      <TableCell>
        <Skeleton className="h-5 w-36" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-14" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <Skeleton className="size-9" />
        </div>
      </TableCell>
    </TableRow>
  ));
}

function AdminSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

async function listUsers() {
  const result = await authClient.admin.listUsers({
    query: {
      limit: 100,
      offset: 0,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });

  if (result.error || !result.data) {
    throw new Error(errorMessage(result.error, "Could not load users"));
  }

  return result.data;
}

async function createUser(values: CreateUserValues) {
  const result = await authClient.admin.createUser(values);

  if (result.error || !result.data) {
    throw new Error(errorMessage(result.error, "Could not create user"));
  }

  return result.data;
}

async function setUserRole({ userId, role }: { userId: string; role: UserRole }) {
  const result = await authClient.admin.setRole({ userId, role });

  if (result.error || !result.data) {
    throw new Error(errorMessage(result.error, "Could not update role"));
  }

  return result.data;
}

async function banUser(userId: string) {
  const result = await authClient.admin.banUser({ userId });

  if (result.error || !result.data) {
    throw new Error(errorMessage(result.error, "Could not ban user"));
  }

  return result.data;
}

async function unbanUser(userId: string) {
  const result = await authClient.admin.unbanUser({ userId });

  if (result.error || !result.data) {
    throw new Error(errorMessage(result.error, "Could not unban user"));
  }

  return result.data;
}

function userRole(user: AdminUser): UserRole {
  return user.role === "admin" ? "admin" : "user";
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
