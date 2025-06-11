// seatalk-unzip-mcp-bot/server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const APP_ID = process.env.SEATALK_APP_ID;
const APP_SECRET = process.env.SEATALK_APP_SECRET;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

let accessToken = null;

// → 換 SeaTalk access_token
async function getAccessToken() {
  const res = await axios.post('https://openapi.seatalk.io/oauth2/token', {
    app_id: APP_ID,
    app_secret: APP_SECRET,
    grant_type: 'client_credentials'
  });
  accessToken = res.data.access_token;
  return accessToken;
}

// → 對用戶或群組回覆訊息
async function replyTo(event, content) {
  if (!accessToken) await getAccessToken();

  const payload = {
    tag: 'text',
    text: { content }
  };

  if (event.conversation_type === 'p2p') {
    payload.user_id = event.from_user_id;
  } else {
    payload.chat_id = event.chat_id;
  }

  await axios.post('https://openapi.seatalk.io/bot/message/send', payload, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

// → 接收 webhook 訊息
app.post('/webhook', async (req, res) => {
  const body = req.body;
  const message = body.event?.message?.text?.content;

  if (!message) return res.sendStatus(200);

  const match = message.match(/https:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view/);
  if (!match) return res.sendStatus(200);

  const fileId = match[1];
  const zipUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  try {
    const apiRes = await axios.post(APPS_SCRIPT_URL, { url: zipUrl });
    const folderUrl = apiRes.data.folderUrl || '無法取得資料夾';
    await replyTo(body.event, `✅ 解壓完成！請點擊：\n${folderUrl}`);
  } catch (err) {
    console.error('[解壓錯誤]', err.message);
    await replyTo(body.event, '❌ 解壓失敗，請稍後再試或確認連結是否正確。');
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Seatalk MCP Bot running on port ${PORT}`);
});
