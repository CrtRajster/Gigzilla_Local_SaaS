# Gigzilla Desktop App

Electron-based desktop application for freelancer management with secure license validation.

## Features

✅ **Secure Authentication**
- 14-day free trial (no credit card)
- Email-based license validation
- Offline mode (7-day grace period via JWT)
- Device limit enforcement (3 devices)

✅ **Device Management**
- View all registered devices
- Deactivate devices remotely
- Hardware change detection

✅ **License Management**
- Real-time license validation
- Automatic re-validation (24h intervals)
- Expiration warnings
- Upgrade/downgrade support

✅ **Cross-Platform**
- Windows, macOS, Linux support
- Native menu integration
- Secure storage (electron-store)

## Prerequisites

- Node.js v18 or higher
- npm or yarn

## Installation

1. Install dependencies:
```bash
cd desktop-app
npm install
```

2. Set environment variables (optional):
```bash
# Create .env file
API_URL=https://your-worker.workers.dev
STRIPE_CHECKOUT_URL=https://gigzilla.site/subscribe
```

## Development

Run the app in development mode:

```bash
npm run dev
```

This will:
1. Show loading screen
2. Validate license on startup
3. Show activation screen (if no license) OR main app (if valid license)
4. Enable DevTools automatically

## Building

Build for your platform:

```bash
# All platforms
npm run build

# Windows only
npm run build:win

# macOS only
npm run build:mac

# Linux only
npm run build:linux
```

## Project Structure

```
desktop-app/
├── main.js              # Electron main process
├── preload.js           # Security bridge (IPC)
├── index.html           # Main app UI
├── loading.html         # Loading screen
├── package.json         # Dependencies & build config
└── ../desktop-app-auth/ # Authentication modules
    ├── auth-manager.js      # License validation
    ├── machine-id.js        # Hardware fingerprinting
    └── activation-screen.html # License entry UI
```

## How It Works

### Startup Flow

```
1. App launches
   └─> Show loading screen

2. Validate license (validateOnStartup)
   ├─> Check for cached license
   ├─> Check if revalidation needed (24h)
   └─> Try online validation
       ├─> Success: Use fresh license
       └─> Network error: Check offline JWT token
           ├─> Valid JWT: Use offline mode
           └─> Expired JWT: Show activation screen

3. Show appropriate window
   ├─> No license: Activation screen
   └─> Valid license: Main app
```

### License Validation

**Online Mode:**
- Validates with API every 24 hours
- Registers device if new
- Gets fresh JWT token (7-day validity)
- Updates local license data

**Offline Mode:**
- Works for 7 days without internet
- Validates JWT token locally
- Shows warning to user
- Automatic switch to online when available

### Device Management

**Device Limit (3 devices):**
- Each device gets unique hardware-based ID
- IDs hashed with SHA-256 for privacy
- Tracked in Stripe customer metadata

**Deactivation:**
- Users can view all registered devices
- Deactivate old devices to free up slots
- Manual deactivation via Account menu

## Menu Bar

### Account Menu

- **License Information** - View current license details
- **Manage Devices** - See all registered devices
- **Upgrade Plan** - Open Stripe checkout
- **Referral Program** - View referral code & stats
- **Logout** - Clear license and show activation screen
- **Deactivate This Device** - Remove current device from license

## Keyboard Shortcuts

- `Cmd/Ctrl + N` - New Client
- `Cmd/Ctrl + Shift + N` - New Project
- `Cmd/Ctrl + ,` - Preferences
- `Cmd/Ctrl + R` - Reload
- `Cmd/Ctrl + Shift + I` - Toggle DevTools

## Security

✅ **Context Isolation** - Renderer processes isolated from Node.js
✅ **Preload Script** - Secure IPC bridge
✅ **No Node Integration** - Renderer can't access Node.js directly
✅ **Encrypted Storage** - electron-store with encryption
✅ **SHA-256 Hashing** - Machine IDs hashed for privacy

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Backend API URL | `https://gigzilla-api.YOUR-USERNAME.workers.dev` |
| `STRIPE_CHECKOUT_URL` | Stripe checkout page | `https://gigzilla.site/subscribe` |
| `NODE_ENV` | Environment | `production` |

## Testing

### Test Activation Flow

1. Run app: `npm start`
2. Enter email in activation screen
3. Click "Start Free Trial"
4. Browser opens to Stripe checkout
5. Click "I Already Subscribed"
6. App validates license and shows main window

### Test Offline Mode

1. Activate license (online)
2. Disconnect from internet
3. Restart app
4. Should show "Working offline" notification
5. App continues to work normally

### Test Device Limit

1. Activate on 3 different machines
2. Try to activate on 4th machine
3. Should get "Device limit reached" error
4. Deactivate one device via Account menu
5. 4th machine should now activate successfully

## Troubleshooting

**License validation fails:**
- Check internet connection
- Verify API_URL is correct
- Check console for error messages

**Offline mode not working:**
- Ensure you've validated online at least once
- Check JWT token hasn't expired (7 days max)
- Clear cache and revalidate online

**Device limit reached:**
- Use "Manage Devices" to see all registered devices
- Deactivate old devices you no longer use
- Contact support if you need more device slots

## Production Deployment

1. Update `API_URL` in main.js
2. Update encryption key in main.js
3. Add app icons to `assets/` folder
4. Build for target platforms: `npm run build`
5. Distribute via your website or app store

## License

Proprietary - All rights reserved

## Support

- Email: support@gigzilla.site
- Website: https://gigzilla.site
- Documentation: https://gigzilla.site/docs
