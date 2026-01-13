# VaultRaider - Azure Configuration

## Setup Instructions

### 1. Azure App Registration

You need to create an App Registration in your Azure Entra ID (formerly Azure AD):

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Name: `VaultRaider` (or any name you prefer)
4. Supported account types: Choose based on your needs (typically "Accounts in this organizational directory only")
5. Redirect URI: Leave empty for device code flow
6. Click **Register**

### 2. Configure API Permissions

After creating the app registration:

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Azure Key Vault** 
4. Select **Delegated permissions**
5. Check **user_impersonation**
6. Click **Add permissions**
7. (Optional) Click **Grant admin consent** if you have admin rights

### 3. Get Your Configuration Values

From the App Registration overview page:

- **Application (client) ID**: Copy this value
- **Directory (tenant) ID**: Copy this value

### 4. Update the Code

Open `src-tauri/src/azure_auth.rs` and replace:

```rust
const CLIENT_ID: &str = "YOUR_CLIENT_ID_HERE"; // Replace with your Client ID
const TENANT_ID: &str = "YOUR_TENANT_ID_HERE"; // Replace with your Tenant ID
```

### 5. Run the Application

```powershell
bun run tauri dev
```

## Authentication Flow

This app uses the **Device Code Flow** which is ideal for desktop applications:

1. Click "Sign in with Azure"
2. A browser window will open with a code
3. Enter the code and sign in with your Azure credentials
4. Return to the app - you'll be authenticated!

## Troubleshooting

- **Error: "Authentication failed"**: Check your Client ID and Tenant ID
- **Error: "Permission denied"**: Ensure API permissions are granted
- **Browser doesn't open**: The device code will be shown in the console - you can manually go to https://microsoft.com/devicelogin

