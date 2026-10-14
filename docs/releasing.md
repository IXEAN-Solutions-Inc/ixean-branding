# Publishing a brand-kit release

A release gives people without a GitHub account two things the repository cannot: one zip with every asset, and the video masters that are too large to commit.

Publish a new release whenever the files in `assets/` change.

## Steps

1. Rebuild and verify the assets (see [../scripts/README.md](../scripts/README.md)). Commit and push.
2. Build the kit zip from the repository root:

   ```bash
   VERSION=v1.0.0
   rm -f dist/ixean-brand-kit.zip
   zip -r -q dist/ixean-brand-kit.zip assets docs/brand-guidelines.md docs/for-marketing.md docs/for-developers.md README.md
   ```

   On Windows without `zip`, use `tar -a -cf dist/ixean-brand-kit.zip assets docs/brand-guidelines.md docs/for-marketing.md docs/for-developers.md README.md`.

3. Create the release with the kit and every video master attached:

   ```bash
   npx -y gh-axi release create "$VERSION" --title "IXEAN brand kit $VERSION" \
     --notes "Brand kit and video masters. See README for which file to use." \
     dist/ixean-brand-kit.zip dist/motion-masters/*
   ```

4. Open https://github.com/IXEAN-Solutions-Inc/ixean-branding/releases/latest while logged out and download the kit to confirm it works without an account.

The README and marketing guide link to `releases/latest`, so the links stay valid for every new release.

Keep the file name `ixean-brand-kit.zip` the same in every release. Put the version in the tag, not the file name.
