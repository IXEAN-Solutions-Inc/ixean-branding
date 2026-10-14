# Deploying the motion showcase

The showcase (`motion/ixean-logo-motion.html`) is hosted on Cloudflare Pages, project `ixean-logo-motion`, at https://ixean-logo-motion.pages.dev. The site is public but sends `X-Robots-Tag: noindex`, so search engines do not list it ahead of the main website.

Deploy only when the change is approved. Every deploy is visible immediately.

## Prerequisites

- A Cloudflare API token with **Cloudflare Pages: Edit** on the account that owns the project. Ask the IXEAN engineering lead for access.
- The Cloudflare account ID, from the dashboard URL.

Set both in your environment. Never commit either, and never paste either into a file, an issue, or chat.

## Deploy

```bash
export CLOUDFLARE_API_TOKEN=...      # Pages: Edit
export CLOUDFLARE_ACCOUNT_ID=...

DIST=$(mktemp -d)
cp motion/ixean-logo-motion.html "$DIST/index.html"
printf '/*\n  X-Robots-Tag: noindex\n' > "$DIST/_headers"
npx -y wrangler@4 pages deploy "$DIST" --project-name ixean-logo-motion --branch main
```

Both extra steps are required: Pages serves `index.html` at the root, and `_headers` adds the `noindex` header.

## Check the result

```bash
curl -sI https://ixean-logo-motion.pages.dev | grep -iE '^(HTTP|x-robots-tag)'
```

Expect `HTTP/1.1 200 OK` and `x-robots-tag: noindex`.

## If a token leaks

If the token appears in a file, a commit, or a log, revoke it in the Cloudflare dashboard and create a new one before doing anything else.
