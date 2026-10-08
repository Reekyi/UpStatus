# Changelog

## 2026-10-07

### Release pipeline v1
- Established `3.0.26` as the production baseline.
- Added `develop` as the TEST/integration branch.
- Added a single release configuration file.
- Extracted the userscript into a readable source template.
- Extracted the Edge Function into a generated source template.
- Added reproducible build and validation scripts.
- Isolated TEST storage, Realtime signaling, and ringtone coordination.
- Added validation, manual TEST deployment, and manual production workflows.
- Automatic TEST deployment is intentionally paused until GitHub Actions Supabase secrets are configured.
- Production runtime was not modified by the pipeline refactor.
\n
## 2026-10-08

### 3.0.27-beta.5
- Chat notifications now stack up to 3 visible balloons instead of replacing the previous one.
- Additional messages are queued and displayed as older balloons leave the screen.
- Each notification stays visible for 3 seconds and now has entry and exit animations.
- Added a pending notification counter for messages waiting in the queue.
