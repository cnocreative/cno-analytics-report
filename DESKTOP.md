# CNO Reports — desktop app

The report generator can be packaged as a real installable app for **Windows** and **macOS**,
in addition to running in a browser or as an installable web app (PWA). Same single `index.html`
inside a native window, powered by [Electron](https://www.electronjs.org/).

Most users should keep the hosted report bookmarked or install the web app; no separate download is required. The native installer is optional for CNO staff who want a dedicated offline desktop window.

## Fastest installation: save the hosted report as an app

Open `https://cno-analytics-report-5hi6.onrender.com/`, then click **Get the app** in the top toolbar for device-specific instructions. The older non-suffixed Render address is retired.

- **Chrome or Edge:** use the install icon in the address bar or the browser menu's **Install CNO Reports** command.
- **Mac Safari (macOS Sonoma 14+):** choose **File → Add to Dock**.
- **iPhone or iPad Safari:** tap **Share → Add to Home Screen**.

This keeps the app up to date automatically and avoids unsigned-installer warnings.

You do **not** need a Mac to build the Mac version, and you do not need to install anything to
get the installers. GitHub builds them for you.

## Native installer download

Published Windows and Mac installers appear on the repo's [latest release](https://github.com/cnocreative/cno-analytics-report/releases/latest). If no release is listed yet, use the GitHub build steps below.

## Updating

- **Hosted site or browser-installed app:** updates automatically after the new Render deployment. Close and reopen it if an older cached screen remains.
- **Windows `.exe` or Mac `.dmg`:** download the newest installer from the latest GitHub release and run it over the existing installation. Saved local settings remain in the app profile. The current pilot does not silently auto-install native updates.

## How GitHub builds the installers

A workflow at `.github/workflows/build-desktop.yml` builds both installers on GitHub's own
Windows and macOS machines.

**Option A — tag a release (recommended).** From the repo:

```bash
git tag v1.6.0
git push origin v1.6.0
```

In a few minutes a **Release** appears on GitHub with two files attached:

- `CNO Reports Setup 1.6.0.exe` — Windows installer
- `CNO Reports-1.6.0-arm64.dmg` — macOS Apple Silicon disk image

**Option B — run it on demand.** On GitHub: **Actions → "Build desktop installers" → Run workflow.**
When it finishes, download the installers from the run's **Artifacts** section.

Bump the `"version"` in `package.json` for each new release so the tag and the installer match.

## Installing the app

- **Windows:** double-click the `.exe`, choose a folder, done. Because the app is not code-signed,
  Windows SmartScreen may say "Windows protected your PC." Click **More info → Run anyway**.
- **macOS:** open the `.dmg`, drag **CNO Reports** to Applications. Because the app is not signed
  by an Apple Developer account, the first launch needs **right-click → Open → Open** (a normal
  double-click will refuse). After that it opens normally.

Removing those two friction points requires paid code-signing certificates (an Apple Developer
account at 99 USD per year for macOS, and a Windows code-signing certificate). For an internal
team tool this is optional; the right-click-open step is a one-time thing per machine.

## What the app does

- Opens the full report generator in its own window, offline. No server, no account.
- Everything works exactly like the web version: upload CSVs, load the demo, customize report
  pages, generate the required AI client letter with CNO's key, and print/PDF.
- **Share links created inside the desktop app point to the hosted site**
  (`https://cno-analytics-report-5hi6.onrender.com/`), so a client can open the link in a normal
  browser. If you move the hosted site, update `HOSTED_BASE` near the top of the script in
  `index.html`.

## Building locally (optional, for developers)

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm start          # run the app in a dev window
npm run dist:win   # build a Windows installer   (only works on Windows)
npm run dist:mac   # build a macOS installer      (only works on macOS)
```

Installers land in `dist-desktop/`. A machine can only build its own platform's installer, which
is exactly why the GitHub workflow above exists.

## Minimum OS

Windows 10 (1809+) or Windows 11, and macOS 11 (Big Sur) or newer. Older Windows 10 without the
Edge WebView runtime is handled automatically by the installer.

## Which should we ship — desktop app, or the web app?

Both are maintained from the same `index.html`, so it is not either/or:

- **Web app / PWA** (already live on Render): nothing to install, always the latest version,
  works on phones. Best for clients opening share links and for quick access.
- **Desktop app** (this file): a real icon in the dock/Start menu, opens offline, feels like
  owned software. Best for CNO staff who build reports every month.
