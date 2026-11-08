import path from "node:path";
import { fileURLToPath } from "node:url";

export function assertProductionProject(project, expectedRef, expectedOrganizationId) {
  const actualRef = String(project?.id || project?.ref || "");
  if (actualRef !== expectedRef) {
    throw new Error("Management API project reference does not match the approved production project.");
  }
  if (String(project?.organization_id || "") !== expectedOrganizationId) {
    throw new Error("Production project is not owned by the expected UpStatus Supabase organization.");
  }
  if (project?.status !== "ACTIVE_HEALTHY") {
    throw new Error("Production project must be ACTIVE_HEALTHY before deployment.");
  }
  const expectedDatabaseHost = "db." + expectedRef + ".supabase.co";
  if (String(project?.database?.host || "") !== expectedDatabaseHost) {
    throw new Error("Production database host does not match its project reference.");
  }
  return { ref: actualRef, organizationId: expectedOrganizationId };
}

async function main() {
  const projectRef = String(process.env.SUPABASE_PROJECT_ID || "").trim();
  const expectedProductionRef = String(process.env.EXPECTED_PRODUCTION_PROJECT_ID || "").trim();
  const isolatedRef = String(process.env.EXPECTED_ISOLATED_SIGNALING_PROJECT_ID || "").trim();
  const expectedOrganizationId = String(process.env.EXPECTED_SUPABASE_ORGANIZATION_ID || "").trim();
  const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || "").trim();

  if (!/^[a-z0-9]{20}$/.test(projectRef) || !/^[a-z0-9]{20}$/.test(expectedProductionRef)) {
    throw new Error("Production project references are missing or malformed.");
  }
  if (projectRef !== expectedProductionRef || projectRef === isolatedRef) {
    throw new Error("SUPABASE_PROJECT_ID does not match the approved production project; refusing deployment.");
  }
  if (!/^[a-z0-9]{20}$/.test(expectedOrganizationId)) {
    throw new Error("EXPECTED_SUPABASE_ORGANIZATION_ID is missing or malformed.");
  }
  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is required for read-only production project verification.");
  }

  const endpoint = "https://api.supabase.com/v1/projects/" + encodeURIComponent(projectRef);
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error("Supabase Management API production preflight failed with HTTP " + response.status + "; refusing deployment.");
  }

  let project;
  try {
    project = await response.json();
  } catch {
    throw new Error("Supabase Management API returned invalid project metadata; refusing deployment.");
  }

  const verified = assertProductionProject(project, expectedProductionRef, expectedOrganizationId);
  console.log("Verified approved production project " + verified.ref + " is ACTIVE_HEALTHY in the expected UpStatus organization.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error("Production project preflight failed: " + error.message);
    process.exitCode = 1;
  });
}
