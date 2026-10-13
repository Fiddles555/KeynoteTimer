# Keynote Timer — Electron App

## Quick start (run without building)

1. Install [Node.js](https://nodejs.org) (v18 or later)
2. Open Terminal in this folder
3. Run:
   ```
   npm install
   npm start
   ```

## Build a distributable app

### Mac (.dmg)
```
npm run build-mac
```
Output: `dist/Keynote Timer-1.0.0.dmg`

### Windows (.exe installer)
```
npm run build-win
```
Output: `dist/Keynote Timer Setup 1.0.0.exe`

## External display
- Go to **Settings → Open External Display** (or press ⌘⇧E on Mac / Ctrl+Shift+E on Windows)
- If a second monitor is connected, the timer opens fullscreen on it automatically
- If only one screen, the window opens on your main display — drag it to your projector and press ⌘Ctrl+F (Mac) or F11 (Windows) to fullscreen
