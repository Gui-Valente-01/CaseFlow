export function isMissingRpc(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42883" ||
    message.includes("could not find the function") ||
    message.includes("schema cache")
  );
}
