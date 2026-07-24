export function errorMessage(
  error: { message?: string } | null | undefined,
  fallback = "Something went wrong",
) {
  return error?.message || fallback;
}
