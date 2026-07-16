# Auto-deploy to shpara.com/bulldozer

`deploy.yml` builds the site on every push and pushes `dist/` into the
`kirshp/shpara1` monorepo under `bulldozer/`, which Cloudflare Pages serves.
It needs one secret so the Action can write to `shpara1`.

## One-time setup

1. **Generate a deploy keypair** (locally, no passphrase):
   ```
   ssh-keygen -t ed25519 -f shpara1_deploy -N "" -C "bulldozer-deploy"
   ```
   → `shpara1_deploy` (private) and `shpara1_deploy.pub` (public).

2. **Add the public key to `shpara1`** — GitHub → `kirshp/shpara1` →
   Settings → Deploy keys → *Add deploy key* → paste `shpara1_deploy.pub`,
   **tick "Allow write access"**, save.

3. **Add the private key to `bulldozer`** — GitHub → `kirshp/bulldozer` →
   Settings → Secrets and variables → Actions → *New repository secret* →
   name `SHPARA1_DEPLOY_KEY`, value = the whole `shpara1_deploy` file.

4. Delete the local key files. Done — the next push deploys automatically,
   or run it manually from the Actions tab (*Run workflow*).

Until the secret exists the deploy step is skipped (the run still goes green).
