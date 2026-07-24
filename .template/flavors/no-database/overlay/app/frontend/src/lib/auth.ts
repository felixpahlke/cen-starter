// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
type Role = "user" | "admin";

type StubUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  image?: string | null;
  banned?: boolean;
  createdAt?: Date;
};

type StubSession = {
  user: StubUser;
};

type AuthResult<T> = Promise<{ data: T; error: null }>;

const session: StubSession = {
  user: {
    id: "api",
    email: "api@local",
    name: "API client",
    role: "admin",
    image: null,
    banned: false,
    createdAt: new Date(0),
  },
};

function ok<T>(data: T): AuthResult<T> {
  return Promise.resolve({ data, error: null });
}

export function useSession() {
  return {
    data: session,
    isPending: false,
    refetch: () => ok(session),
  };
}

export const signIn = {
  email: (_values: unknown) => ok(session),
};

export const signUp = {
  email: (_values: unknown) => ok(session),
};

export const signOut = () => ok(null);

export const authClient = {
  updateUser: (values: { name?: string }) =>
    ok({ ...session.user, name: values.name ?? session.user.name }),
  changePassword: (_values: unknown) => ok(null),
  admin: {
    listUsers: (_options: unknown) => ok({ users: [session.user], total: 1 }),
    createUser: (values: { name: string; email: string; role?: Role }) =>
      ok({
        user: {
          ...session.user,
          id: values.email,
          email: values.email,
          name: values.name,
          role: values.role ?? "user",
        },
      }),
    setRole: ({ role }: { userId: string; role: Role }) => ok({ user: { ...session.user, role } }),
    banUser: (_values: { userId: string }) => ok({ success: true }),
    unbanUser: (_values: { userId: string }) => ok({ success: true }),
  },
};
