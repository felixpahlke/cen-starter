// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Add, OverflowMenuVertical } from "@carbon/icons-react";
import type { DataTableHeader } from "@carbon/react";
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Form,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  PasswordInput,
  Select,
  SelectItem,
  SkeletonText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  Tag,
  TextInput,
} from "@carbon/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient, useSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";

const usersQueryKey = ["admin", "users"] as const;
const roleOptions = ["user", "admin"] as const;
const userHeaders = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
  { key: "status", header: "Status" },
  { key: "actions", header: "Actions" },
] satisfies DataTableHeader[];

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
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "banned";
  actions: string;
};

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
    onError: (error) => toast.error(errorMessage(error, "Could not update role")),
  });
  const banMutation = useMutation({
    mutationFn: banUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey });
      toast.success("User banned");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not ban user")),
  });
  const unbanMutation = useMutation({
    mutationFn: unbanUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey });
      toast.success("User unbanned");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not unban user")),
  });

  if (session.isPending) {
    return <AdminSkeleton />;
  }

  if (session.data?.user.role !== "admin") {
    return <Navigate to="/" />;
  }

  const users = usersQuery.data?.users ?? [];
  const userById = new Map(users.map((user) => [user.id, user]));
  const rows = users.map(toUserRow);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h1 className="cds--type-heading-05">Admin</h1>
        <p className="cds--type-body-01 text-text-secondary">
          User management from the Better Auth admin plugin.
        </p>
      </div>
      <DataTable rows={rows} headers={userHeaders} size="lg">
        {({
          rows: tableRows,
          headers,
          getHeaderProps,
          getRowProps,
          getTableProps,
          getCellProps,
        }) => (
          <TableContainer
            title="Users"
            description="List users, create accounts, change roles, and ban access."
          >
            <TableToolbar>
              <TableToolbarContent>
                <Button renderIcon={Add} onClick={() => setCreateOpen(true)}>
                  Create user
                </Button>
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    const { key, ...headerProps } = getHeaderProps({ header });
                    return (
                      <TableHeader key={key} {...headerProps}>
                        {header.header}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {usersQuery.isPending ? <UserSkeletonRows /> : null}
                {usersQuery.isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={headers.length}
                      className="py-8 text-center text-support-error"
                    >
                      {usersQuery.error.message}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!usersQuery.isPending && !usersQuery.isError && tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={headers.length}
                      className="py-8 text-center text-text-secondary"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : null}
                {!usersQuery.isPending && !usersQuery.isError
                  ? tableRows.map((row) => {
                      const user = userById.get(row.id);
                      if (!user) {
                        return null;
                      }

                      const role = userRole(user);
                      const nextRole = role === "admin" ? "user" : "admin";
                      const { key, ...rowProps } = getRowProps({ row });

                      return (
                        <TableRow key={key} {...rowProps}>
                          {row.cells.map((cell) => {
                            const { key: cellKey, ...cellProps } = getCellProps({ cell });

                            if (cell.info.header === "role") {
                              return (
                                <TableCell key={cellKey} {...cellProps}>
                                  <Tag type={role === "admin" ? "purple" : "gray"} size="sm">
                                    {role}
                                  </Tag>
                                </TableCell>
                              );
                            }

                            if (cell.info.header === "status") {
                              return (
                                <TableCell key={cellKey} {...cellProps}>
                                  <Tag type={user.banned ? "red" : "green"} size="sm">
                                    {user.banned ? "banned" : "active"}
                                  </Tag>
                                </TableCell>
                              );
                            }

                            if (cell.info.header === "actions") {
                              return (
                                <TableCell key={cellKey} {...cellProps}>
                                  <div className="flex justify-end">
                                    <OverflowMenu
                                      aria-label={`Actions for ${user.email}`}
                                      flipped
                                      renderIcon={OverflowMenuVertical}
                                      size="sm"
                                    >
                                      <OverflowMenuItem
                                        itemText={nextRole === "admin" ? "Make admin" : "Make user"}
                                        disabled={setRoleMutation.isPending}
                                        onClick={() =>
                                          setRoleMutation.mutate({
                                            userId: user.id,
                                            role: nextRole,
                                          })
                                        }
                                      />
                                      {user.banned ? (
                                        <OverflowMenuItem
                                          itemText="Unban"
                                          disabled={unbanMutation.isPending}
                                          onClick={() => unbanMutation.mutate(user.id)}
                                        />
                                      ) : (
                                        <OverflowMenuItem
                                          itemText="Ban"
                                          isDelete
                                          disabled={banMutation.isPending}
                                          onClick={() => banMutation.mutate(user.id)}
                                        />
                                      )}
                                    </OverflowMenu>
                                  </div>
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell
                                key={cellKey}
                                {...cellProps}
                                className={
                                  cell.info.header === "email" ? "text-text-secondary" : undefined
                                }
                              >
                                {String(cell.value ?? "")}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <CreateUserModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateUserModal({
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
    onError: (error) => toast.error(errorMessage(error, "Could not create user")),
  });

  function onSubmit(values: CreateUserValues) {
    createMutation.mutate(values);
  }

  return (
    <Modal
      open={open}
      modalHeading="Create user"
      primaryButtonText="Create user"
      secondaryButtonText="Cancel"
      onRequestClose={() => onOpenChange(false)}
      onRequestSubmit={() => void form.handleSubmit(onSubmit)()}
      primaryButtonDisabled={createMutation.isPending}
      loadingStatus={createMutation.isPending ? "active" : "inactive"}
      loadingDescription="Creating user"
    >
      <Form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap={6}>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextInput
                {...field}
                id="create-user-name"
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
                id="create-user-email"
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
                id="create-user-password"
                autoComplete="new-password"
                labelText="Password"
                invalid={!!fieldState.error}
                invalidText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="role"
            render={({ field, fieldState }) => (
              <Select
                id="create-user-role"
                labelText="Role"
                name={field.name}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.value)}
                invalid={!!fieldState.error}
                invalidText={fieldState.error?.message}
              >
                <SelectItem value="user" text="user" />
                <SelectItem value="admin" text="admin" />
              </Select>
            )}
          />
        </Stack>
      </Form>
    </Modal>
  );
}

function UserSkeletonRows() {
  return ["admin-user-skeleton-1", "admin-user-skeleton-2", "admin-user-skeleton-3"].map((id) => (
    <TableRow key={id}>
      <TableCell>
        <SkeletonText width="10rem" />
      </TableCell>
      <TableCell>
        <SkeletonText width="16rem" />
      </TableCell>
      <TableCell>
        <SkeletonText width="4rem" />
      </TableCell>
      <TableCell>
        <SkeletonText width="4rem" />
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <SkeletonText width="2rem" />
        </div>
      </TableCell>
    </TableRow>
  ));
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonText heading width="8rem" />
        <SkeletonText width="20rem" />
      </div>
      <DataTableSkeleton headers={userHeaders} rowCount={4} columnCount={5} showToolbar />
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

function toUserRow(user: AdminUser): UserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: userRole(user),
    status: user.banned ? "banned" : "active",
    actions: "",
  };
}

function userRole(user: AdminUser): UserRole {
  return user.role === "admin" ? "admin" : "user";
}
