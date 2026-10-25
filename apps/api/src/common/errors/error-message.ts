/**
 * Safely extract a human-readable message from an unknown thrown value.
 * Prefer this over `catch (error: any)` so error handling stays type-safe.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
