# SeaTalk Unzip Bot

This app is a Node.js webhook server for SeaTalk System Bot.
It receives ZIP file URLs from SeaTalk, calls your Google Apps Script unzip API, and posts back the extracted folder link.

## Deployment Steps

1. Deploy to Render:
   - Connect to GitHub
   - Choose this repository `seatalk-unzip-bot`
   - Environment: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Region: Singapore
2. Use the generated URL as your SeaTalk webhook: `https://[YOUR_APP].onrender.com/webhook`
3. Test by sending a Drive ZIP link in SeaTalk group.
