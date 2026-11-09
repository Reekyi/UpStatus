import path from "node:path";
import { fileURLToPath } from "node:url";

export function assertTeamLiteProductionProject(project, expectedRef, expectedOrganizationId) {
  const actualRef = String(project?.id || project?.ref || "");
  if (actualRef !== expectedRef) {
    throw new Error("Management API project reference does not match the approved production project.");
  }
  if (String(project?.organization_id || "") !== expectedOrganizationId) {
    throw new Error("Production project is not owned by the expected UpStatus organization.");
  }
  if (project?.status !== "ACTIVE_HEALTHY") {
    throw new Error("Production project must be ACTIVE_HEALTHY before deployment.");
  }
  const expectedHost = "db." + expectedRef + ".supabase.co";
  if (String(project?.database?.host || "") !== expectedHost) {
    throw new Error("Production database host does not match its project reference.");
  }
  return { projectRef: actualRef, organizationId: expectedOrganizationId };
}

export function assertTeamLiteProductionMainBranch(payload, expectedGitBranch = "master") {
  const branches = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.branches)
      ? payload.branches
      : null;
  if (!branches) {
    throw new Error("Supabase Management API returned an invalid managed-branch response; refusing deployment.");
  }
  const defaults = branches.filter(branch => branch?.name === "main" && branch?.is_default === true);
  if (defaults.length !== 1) {
    throw new Error("Supabase production must expose exactly one default managed main branch; refusing deployment.");
  }
  const main = defaults[0];
  if (String(main.git_branch || "") !== expectedGitBranch) {
    throw new Error("Managed production main branch must track the approved " + expectedGitBranch + " Git branch.");
  }
  if (String(main.status || "") !== "ACTIVE_HEALTHY") {
    throw new Error("Managed production branch main is not ACTIVE_HEALTHY (" + String(main.status || "unknown") + "); refusing deployment.");
  }
  return {
    branchId: String(main.id || ""),
    branchName: "main",
    gitBranch: expectedGitBranch,
    status: "ACTIVE_HEALTHY",
  };
}

export async function verifyTeamLiteProductionProject({
  projectRef,
  expectedProductionRef,
  isolatedProjectRef,
  expectedOrganizationId,
  accessToken,
  fetchImpl = fetch,
}) {
  const actualRef = String(projectRef || "").trim();
  const expectedRef = String(expectedProductionRef || "").trim();
  const isolatedRef = String(isolatedProjectRef || "").trim();
  const organizationId = String(expectedOrganizationId || "").trim();
  const token = String(accessToken || "").trim();

  if (!/^[a-z0-9]{20}$/.test(actualRef) || !/^[a-z0-9]{20}$/.test(expectedRef)) {
    throw new Error("Team Lite production project references are missing or malformed.");
  }
  if (actualRef !== expectedRef || actualRef === isolatedRef) {
    throw new Error("SUPABASE_PROJECT_ID does not match the approved production project; refusing deployment.");
  }
  if (!/^[a-z0-9]{20}$/.test(organizationId)) {
    throw new Error("Expected Supabase organization ID is missing or malformed.");
  }
  if (!token) {
    throw new Error("SUPABASE_ACCESS_TOKEN is required for read-only project verification.");
  }

  const headers = {
    Authorization: "Bearer " + token,
    Accept: "application/json",
  };
  const projectEndpoint = "https://api.supabase.com/v1/projects/" + encodeURIComponent(actualRef);
  let projectResponse;
  try {
    projectResponse = await fetchImpl(projectEndpoint, {
      method: "GET",
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Supabase Management API project preflight failed; refusing deployment.");
  }
  if (!projectResponse.ok) {
    throw new Error("Supabase Management API project preflight failed with HTTP " + projectResponse.status + "; refusing deployment.");
  }

  let project;
  try {
    project = await projectResponse.json();
  } catch {
    throw new Error("Supabase Management API returned invalid project metadata; refusing deployment.");
  }
  const verifiedProject = assertTeamLiteProductionProject(project, expectedRef, organizationId);

  const branchesEndpoint = projectEndpoint + "/branches";
  let branchesResponse;
  try {
    branchesResponse = await fetchImpl(branchesEndpoint, {
      method: "GET",
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Supabase Management API managed-branch preflight failed; refusing deployment.");
  }
  if (!branchesResponse.ok) {
    throw new Error("Supabase Management API managed-branch preflight failed with HTTP " + branchesResponse.status + "; refusing deployment.");
  }

  let branches;
  try {
    branches = await branchesResponse.json();
  } catch {
    throw new Error("Supabase Management API returned invalid managed-branch JSON; refusing deployment.");
  }
  const verifiedMainBranch = assertTeamLiteProductionMainBranch(branches);
  return { ...verifiedProject, mainBranch: verifiedMainBranch };
}

async function main() {
  const result = await verifyTeamLiteProductionProject({
    projectRef: process.env.SUPABASE_PROJECT_ID,
    expectedProductionRef: process.env.EXPECTED_PRODUCTION_PROJECT_ID,
    isolatedProjectRef: process.env.EXPECTED_ISOLATED_SIGNALING_PROJECT_ID,
    expectedOrganizationId: process.env.EXPECTED_SUPABASE_ORGANIZATION_ID,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
  });
  console.log("Verified approved Team Lite production project " + result.projectRef +
    " and managed branch " + result.mainBranch.branchName + " are ACTIVE_HEALTHY in the expected UpStatus organization.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error("Team Lite production project preflight failed: " + error.message);
    process.exitCode = 1;
  });
}
