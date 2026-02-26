# WhaTorin WSP ⚙️💬

**WhaTorin** is a lightweight, dedicated desktop wrapper for WhatsApp Web, built with Electron and focused on a minimalist, IRC-style terminal aesthetic.

## ✨ Features

- **Terminal Style:** A custom Flat/Dark IRC theme that removes bubbles, rounded corners, and unnecessary clutter.
- **Ultra-Clean UI:** Monospace fonts (JetBrains Mono/Fira Code) for a pure coding-vibe chat experience.
- **Multiple Profiles:** Support for primary and secondary WhatsApp profiles via session partitions.
- **Floating Settings Menu:** Quick access to theme toggles, profile switching, and developer tools.
- **Privacy Oriented:** No extensions, no tracking, just a clean Chromium session for your chats.
- **Lightweight History:** Optimized `.gitignore` to keep the repository clean from `node_modules`.

## 🚀 Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/awho-coder/WhaTorin.git
   cd WhaTorin
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

## 🛠️ Build

To generate a portable Linux AppImage:

```bash
npm run pack
```

The output will be available in the `dist/` folder.

## ⌨️ Shortcuts

- `Ctrl + R`: Reload custom CSS (Development).
- `Esc`: Close the floating menu.

## 📄 License

This project is licensed under the ISC License.

---

_Created with love for terminal lovers._ 🐧
