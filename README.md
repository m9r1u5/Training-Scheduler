# Training Scheduler (offline Android app)

Files (all in the repo root, except the workflow): index.html, app.js, core.js, manifest.json, sw.js, icon.svg, icon.png, package.json, capacitor.config.json, electron-main.js, desktop-package.json, test.js, README.md
.github/workflows/build.yml  (create it with: Add file > Create new file, name it exactly .github/workflows/build.yml)

Build: Actions tab > Build APK and Windows EXE > Run workflow (green tick = done). Then Releases > latest > scheduler.apk and Training-Scheduler.exe.
Update the app later: upload new app.js / core.js, then tap Update inside the app.
The first line of app.js holds APP_VERSION (Home screen shows it).
