export const register = async () => {
  const { validateEnv } = await import("@/src/lib/env");
  validateEnv();
};
