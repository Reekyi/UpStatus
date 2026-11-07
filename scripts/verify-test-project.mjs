import { assertDedicatedTestProject } from "./test-project-metadata.mjs";

const projectRef = String(process.env.SUPABASE_TEST_PROJECT_ID || "").trim();
const expectedOrganizationId = String(process.env.EXPECTED_SUPABASE_ORGANIZATION_ID || "").trim();
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || "").trim();

async function main() {
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new Error("SUPABASE_TEST_PROJECT_ID must be a 20-character lowercase Supabase project reference.");
  }
  if (!/^[a-z0-9-]{20,40}$/.test(expectedOrganizationId)) {
    throw new Error("EXPECTED_SUPABASE_ORGANIZATION_ID is missing or malformed.");
  }
  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is required for read-only project verification.");
  }

  const endpoint = "https://api.supabase.com/v1/projects/" + encodeURIComponent(projectRef);
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Supabase Management API project verification failed with HTTP " + response.status + "; refusing TEST deployment.");
  }

  let project;
  try {
    project = await response.json();
  } catch {
    throw new Error("Supabase Management API returned invalid project metadata; refusing TEST deployment.");
  }

  const verified = assertDedicatedTestProject(project, projectRef, expectedOrganizationId);
  console.log("Verified TEST project " + verified.ref + " is ACTIVE_HEALTHY in the expected UpStatus organization.");
}

main().catch(error => {
  console.error("TEST project preflight failed: " + error.message);
  process.exitCode = 1;
});
