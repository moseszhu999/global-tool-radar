function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function readSupabaseRuntimeEnv() {
  return Object.freeze({
    supabaseUrl: requiredEnv("SUPABASE_URL"),
    serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    expectedProjectRef: requiredEnv("TOOLRADAR_SUPABASE_PROJECT_REF"),
    expectedInstallationId: requiredEnv("TOOLRADAR_INSTALLATION_ID"),
  });
}
