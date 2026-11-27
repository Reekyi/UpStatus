# UpStatus agent instructions

**Entry point for every AI-assisted UpStatus task.**

Before making changes or answering a project-specific question:
1. Read `docs/UPSTATUS_RELEASE_PROTOCOL.md` completely.
2. Read `docs/UPSTATUS_NEW_CHAT_PROMPT.md` and follow its onboarding steps.
3. Inspect live GitHub and both Supabase projects. Do not rely on this file's version snapshot.
4. Never start implementation before reporting the verified official version, beta version, next beta, latest commit, staging/production health, and quota risk.
5. Never deploy beta to production. Require Ricardo's explicit approval before stable promotion.
6. Follow the Supabase Free-plan quota guardrails in the release protocol. The user's current concern is Log Ingestion at 45% of the 1 GB monthly allowance in the 2026-11-27 screenshot. Avoid verbose/per-request logs and broad log queries.
7. Never claim automatic context loading in a blank ChatGPT chat. The user must paste the new-chat prompt to trigger repository/Supabase inspection.

The release protocol is authoritative for detailed workflow and guardrails.