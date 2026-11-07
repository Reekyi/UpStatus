export function assertDedicatedTestProject(project, expectedRef, expectedOrganizationId) {
  const actualRef = String(project?.id || project?.ref || "");
  if (actualRef !== expectedRef) {
    throw new Error("Management API project reference does not match SUPABASE_TEST_PROJECT_ID.");
  }
  if (String(project?.organization_id || "") !== expectedOrganizationId) {
    throw new Error("TEST project is not owned by the expected UpStatus Supabase organization.");
  }
  if (project?.status !== "ACTIVE_HEALTHY") {
    throw new Error("TEST project must be ACTIVE_HEALTHY before deployment.");
  }
  const expectedDatabaseHost = "db." + expectedRef + ".supabase.co";
  if (String(project?.database?.host || "") !== expectedDatabaseHost) {
    throw new Error("TEST project database host does not match its project reference.");
  }
  return { ref: actualRef, organizationId: expectedOrganizationId };
}
