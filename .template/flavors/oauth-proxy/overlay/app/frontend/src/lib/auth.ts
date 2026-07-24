// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

type Session = {
  user: SessionUser;
};

const sessionQueryKey = ["session"] as const;

export function useSession() {
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
    retry: false,
  });

  return { ...query, data: query.data ?? null };
}

export function signOut() {
  window.location.assign("/oauth2/sign_out");
}

async function getSession(): Promise<Session | null> {
  const response = await api.me.$get();

  if (response.status === 200) {
    return response.json();
  }

  // The RPC type only knows the handler's 200 — middleware 401s (and anything
  // else) arrive as plain responses.
  const { status } = response as unknown as Response;
  if (status === 401) {
    return null;
  }

  throw new Error(`Could not load session (${status})`);
}
