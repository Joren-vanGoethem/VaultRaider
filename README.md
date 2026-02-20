# VaultRaider 🔐

A modern, cross-platform desktop application for managing Azure Key Vaults. Built with Tauri, React, and Rust.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)

## ✨ Features

- 🔐 **Secure Azure Authentication** - OAuth2-based authentication with Azure Active Directory
- 📋 **Multi-Subscription Support** - Browse and manage Key Vaults across all your Azure subscriptions
- 🔑 **Secret Management** - View, search, and manage secrets with ease
- 🎨 **Modern UI** - Clean, intuitive interface built with React and Tailwind CSS
- ⚡ **High Performance** - Native performance powered by Tauri and Rust
- 🌙 **Dark Mode** - Supports light and dark themes
- 🚀 **Cross-Platform** - Works on Windows, macOS, and Linux

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://www.rust-lang.org/) - Systems programming language
- [Tauri Prerequisites](https://tauri.app/v2/guides/prerequisites) - Platform-specific dependencies
- Azure account with access to Key Vaults

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vaultraider.git
   cd vaultraider
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Run in development mode**
   ```bash
   cargo tauri dev
   ```

### Building

Build the application for your platform:

```bash
cargo tauri build
```

The compiled application will be available in `src-tauri/target/release/`.

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI framework with React Compiler for optimization
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first styling
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching and caching
- **Lucide React** - Beautiful icons

### Backend
- **Rust** - High-performance backend
- **Tauri 2** - Desktop application framework

## 🔧 Development

### Available Scripts

- `bun run dev` - Start Vite development server
- `cargo tauri dev` - Run Tauri app in development mode, this start both backend and frontend
- `bun run build` - Build frontend for production
- `cargo tauri build` - Build complete application
- `bun run lint` - Lint code with Biome
- `bun run format` - Format code with Biome
- `bun run check` - Check code quality
- `bun run biome-fix` - Auto-fix linting issues

## 🔐 Authentication

VaultRaider uses Azure Active Directory for authentication. 
On first launch you'll be prompted to sign in with your Azure account, this may either use az cli if logged in or through your default web browser. 
The application securely stores your credentials and automatically refreshes tokens as needed.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting. 
Please run `bun run check` before submitting PRs.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI powered by [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)

## 💬 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/Joren-vanGoethem/VaultRaider/issues) on GitHub.

---

Made with ❤️ using Tauri, React, and Rust

