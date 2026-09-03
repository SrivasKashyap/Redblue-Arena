# Proxy container — security notes

This container is the one component candidates are *supposed* to attack.
Treat it as fully untrusted/expendable:

- No minting/service-wallet private key is present here — only
  `SUPABASE_SERVICE_ROLE_KEY`, scoped to write `http_logs` rows and read
  `waf_rules`. If this key leaks, rotate it in Supabase settings; it
  cannot mint credentials or touch other app infra.
- Juice Shop itself is never exposed publicly — only the proxy's port is
  published (see `docker-compose.yml`); Juice Shop is reached only via
  the internal `arena-net` bridge network.
- Logged request bodies are sanitized (control characters stripped,
  length-capped) before being written to Postgres, and the admin/blue
  UI must render them as escaped text only — never `dangerouslySetInnerHTML`
  or server-side templating of a logged body.
- For production use: spin up a fresh Fly.io machine per match
  (`flyctl machine run` scripted from an admin action) so a compromised
  or corrupted container from one match never carries into the next.
  This scaffold ships one long-lived machine for simplicity — see the
  TODO in `frontend/app/admin` for wiring per-match provisioning.
