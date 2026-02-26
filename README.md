# WhaTorin

A lightweight desktop wrapper for **WhatsApp Web** built with **Tauri** for Linux.

WhaTorin keeps a clean terminal-style look while adding desktop quality-of-life features like a custom top bar, file drag-and-drop, image paste support, and portable distribution formats.

## Features

- Tauri-based app (migrated from Electron)
- Custom IRC/terminal-inspired visual theme
- Frameless custom title bar (drag, minimize, close)
- `Ctrl+V` image paste support in chats
- File drag-and-drop upload support in chats
- Easter egg mode (5 quick clicks on `⚙`)
- Portable **AppImage** build
- Shareable **Flatpak** bundle build

## Quick Start (Development)

### Requirements

- Node.js + npm
- Rust toolchain
- Tauri prerequisites for Linux

Fedora example:

```bash
sudo dnf install -y webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel \
  librsvg2-devel patchelf gcc-c++
```

Debian/Ubuntu example:

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf build-essential curl wget file
```

### Run

```bash
git clone https://github.com/awho-coder/WhaTorin.git
cd WhaTorin
npm install
npm run dev
```

Safe mode (without JS/CSS injection):

```bash
npm run dev:safe
```

## Build

### AppImage

```bash
npm run build:appimage
```

Output:

```bash
src-tauri/target/release/bundle/appimage/WhaTorin_0.1.0_amd64.AppImage
```

Run:

```bash
chmod +x src-tauri/target/release/bundle/appimage/WhaTorin_0.1.0_amd64.AppImage
./src-tauri/target/release/bundle/appimage/WhaTorin_0.1.0_amd64.AppImage
```

If FUSE fails on some systems:

```bash
APPIMAGE_EXTRACT_AND_RUN=1 ./src-tauri/target/release/bundle/appimage/WhaTorin_0.1.0_amd64.AppImage
```

### Flatpak Bundle (for sharing)

Requirements:

```bash
# Fedora
sudo dnf install -y flatpak flatpak-builder

# Debian/Ubuntu
sudo apt install -y flatpak flatpak-builder
```

Build bundle:

```bash
npm run build:flatpak
```

Output:

```bash
dist/WhaTorin.flatpak
```

Install locally:

```bash
flatpak install --user ./dist/WhaTorin.flatpak
flatpak run com.whatorin.cleanwrapper
```

## Recommended Format for Friends

If you want fewer host dependency issues, share the **Flatpak** first.

- AppImage can fail on older systems due to host library/glibc mismatch.
- Flatpak is usually more reliable across different Linux distros.

## Troubleshooting

### AppImage starts but uses wrong icon / generic Wayland icon
Use the latest build from this repository (Tauri icon setup is already handled in current config).

### AppImage opens but gets stuck or behaves weird
Try safe mode:

```bash
WHATORIN_DISABLE_INJECTION=1 ./src-tauri/target/release/bundle/appimage/WhaTorin_0.1.0_amd64.AppImage
```

### Image paste or drag/drop not working
Make sure you're using a recent build. Current Tauri version includes explicit fixes for:

- image paste fallback path
- drag-and-drop handler routing to WhatsApp Web

## Project Scripts

```bash
npm run dev            # Tauri development
npm run dev:safe       # Tauri dev without injection
npm run build          # Tauri default build
npm run build:appimage # Build AppImage
npm run build:flatpak  # Build Flatpak bundle
```

## License

ISC
