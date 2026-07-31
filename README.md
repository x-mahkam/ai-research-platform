<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5a49369d-b2fd-40e9-99d5-c44cb644f8db

## Download & install (Windows)

The easiest way to run the platform on the machine where your simulators (e.g.
COMSOL) are installed:

1. Go to the [**Releases**](../../releases) page and download
   `ai-research-platform-windows.zip` from the latest release.
2. Unzip it anywhere (e.g. `C:\ARP` — avoid `C:\Program Files`).
3. Double-click **`Start-ARP.bat`**. A browser opens at `http://localhost:3000`.

Node.js is bundled, so nothing else needs to be installed. To enable AI analysis
and run COMSOL models, see `README-INSTALL.txt` inside the package (set at least
one AI provider key and point `COMSOL_EXECUTABLE` at your `comsolbatch.exe`).

> Don't see a release yet? Maintainers can create one by pushing a `v*` tag, or
> running the **Build Windows package** workflow manually (Actions tab).

## Run from source (developers)

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set at least one AI provider key in your `.env` — e.g. `GEMINI_API_KEY`
   (free tier) or `ANTHROPIC_API_KEY` (see [.env.example](.env.example))
3. Run the app:
   `npm run dev`
