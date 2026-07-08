import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Same-origin: the Vite proxy (dev) / single container (prod) puts the API on /api/auth.
export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
