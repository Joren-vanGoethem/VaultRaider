# VaultRaider 🔐

A modern desktop application for managing Azure Key Vaults, built with Tauri, Rust, and React.

## Features

- 🔐 Secure Azure authentication using device code flow
- 🎯 Native performance with Rust backend
- 🎨 Modern, responsive UI with React
- 🔒 All credentials and secrets handled securely in Rust
- 🚀 Cross-platform support (Windows, macOS, Linux)

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) or npm
- [Rust](https://www.rust-lang.org/tools/install)
- Azure account with Key Vault access

### Installation

1. **Clone and install dependencies:**
   ```powershell
   bun install
   ```

2. **Configure Azure App Registration:**
   - Follow the detailed instructions in [AZURE_SETUP.md](./AZURE_SETUP.md)
   - Update your Client ID and Tenant ID in `src-tauri/src/azure_auth.rs`

3. **Run the development server:**
   ```powershell
   bun run tauri dev
   ```

### Building for Production

```powershell
bun run tauri build
```

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Authentication**: Azure Identity SDK with device code flow
- **Key Vault Access**: Azure Security KeyVault SDK

## Project Structure

```
VaultRaider/
├── src/                    # React frontend
│   ├── App.tsx            # Main UI component
│   └── App.css            # Styling
├── src-tauri/             # Rust backend
│   └── src/
│       ├── lib.rs         # Tauri commands
│       └── azure_auth.rs  # Azure authentication logic
└── AZURE_SETUP.md         # Azure configuration guide
```

## Development

The app uses Tauri's command system to securely communicate between the React frontend and Rust backend. All Azure API calls, authentication, and secret management happen in Rust for maximum security.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT

