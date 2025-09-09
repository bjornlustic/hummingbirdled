# 🚀 Server Control Guide

This LED Simulator project is now configured for easy server management through VSCode/Cursor.

## 🎛️ Run and Debug Menu Options

Open the **Run and Debug** panel (Cmd+Shift+D) and you'll see these options:

### 🚀 Start LED Simulator
- Kills any existing servers and starts fresh
- Opens in integrated terminal
- Automatically shows server status after launch

### 🔄 Hard Reset Server  
- Force kills all live-server processes
- Starts a completely fresh server instance
- Perfect for when things get stuck

### 🌐 Open Browser
- Quick shortcut to open the simulator in your browser
- Goes directly to http://127.0.0.1:8080

### 🔥 Full Reset + Open Browser (Compound)
- Does a complete hard reset
- Automatically opens browser when ready
- One-click solution for full restart

## ⌨️ Keyboard Shortcuts

When editing `.html`, `.js`, or `.css` files:

- **Cmd+Shift+R**: Hard Reset Server
- **Cmd+Shift+S**: Start Server  
- **Cmd+Shift+K**: Kill All Servers
- **Cmd+Shift+O**: Open Browser

## 📋 Tasks Menu

Access via **Terminal → Run Task** or **Cmd+Shift+P** → "Tasks: Run Task":

- **Start LED Simulator Server**
- **Kill All LED Simulator Servers**  
- **Hard Reset LED Simulator Server**
- **Show Server Status**
- **Open Browser to Simulator**

## 🔧 npm Scripts

From the terminal, you can also use:

```bash
npm start          # Start server
npm stop           # Stop server  
npm restart        # Stop then start
npm run status     # Check if server is running
npm run open       # Open browser
```

## 🛠️ Troubleshooting

If the server gets stuck or won't respond:

1. Use **🔄 Hard Reset Server** from Run and Debug
2. Or keyboard shortcut **Cmd+Shift+R**
3. Or run `npm stop` then `npm start`

The hard reset will force kill all live-server processes and start completely fresh.

## 🌐 Access Your Simulator

Once running, your LED simulator is available at:
**http://127.0.0.1:8080**

The server supports hot reloading - any changes to your files will automatically refresh the browser!
