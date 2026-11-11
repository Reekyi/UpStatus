#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RELEVANT_STATES = new Set(["APPROVED", "CHANGES_REQUESTED", "DISMISSED"]);

export function assertAuthorizedReleaseApproval(reviews, {
  headSha,
  authorLogin,
  authorizedReviewers,
}) {
  if (!Array.isArray(reviews)) {
    throw new Error("GitHub returned an invalid pull-request review history; refusing production approval.");
  }
  const expectedHead = String(headSha || "").trim().toLowerCase();
  const author = String(authorLogin || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedHead) || !author) {
    throw new Error("Current PR head SHA or PR author is missing; refusing production approval.");
  }

  const allowlist = new Set(
    String(authorizedReviewers || "")
      .split(",")
      .map(login => login.trim().toLowerCase())
      .filter(Boolean),
  );
  if (allowlist.size === 0) {
    throw new Error("Repository variable UPSTATUS_RELEASE_REVIEWERS must list authorized human release reviewers.");
  }

  const currentHeadReviews = reviews.filter(review =>
    RELEVANT_STATES.has(String(review?.state || "")) &&
    String(review?.commit_id || "").toLowerCase() === expectedHead
  );
  if (currentHeadReviews.some(review => !Number.isFinite(Date.parse(String(review?.submitted_at || ""))))) {
    throw new Error("A current-head review has an invalid submission timestamp; refusing ambiguous approval ordering.");
  }
  currentHeadReviews.sort((a, b) =>
    Date.parse(a.submitted_at) - Date.parse(b.submitted_at) ||
    Number(a.id || 0) - Number(b.id || 0)
  );

  const latest = currentHeadReviews.at(-1);
  if (!latest || latest.state !== "APPROVED") {
    throw new Error("The current PR head has no latest APPROVED review; stale or dismissed approvals do not qualify.");
  }
  const reviewer = String(latest.user?.login || "").trim();
  if (latest.user?.type !== "User") {
    throw new Error("The latest current-head approval must come from a human GitHub user, not a bot.");
  }
  if (!reviewer || reviewer.toLowerCase() === author) {
    throw new Error("The PR author cannot approve their own production release.");
  }
  if (!allowlist.has(reviewer.toLowerCase())) {
    throw new Error("The latest current-head approver is not in UPSTATUS_RELEASE_REVIEWERS.");
  }

  return { reviewer, headSha: expectedHead, submittedAt: latest.submitted_at };
}

async function main() {
  const [reviewsPath, headSha, authorLogin, authorizedReviewers] = process.argv.slice(2);
  if (!reviewsPath || !headSha || !authorLogin) {
    throw new Error("Usage: verify-team-lite-release-review.mjs <reviews.json> <head-sha> <author-login> <authorized-reviewers>");
  }
  const reviews = JSON.parse(fs.readFileSync(path.resolve(reviewsPath), "utf8"));
  const result = assertAuthorizedReleaseApproval(reviews, { headSha, authorLogin, authorizedReviewers });
  console.log("Verified current-head production approval by authorized human reviewer " + result.reviewer + ".");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error("Team Lite release-review provenance failed: " + error.message);
    process.exitCode = 1;
  });
}
