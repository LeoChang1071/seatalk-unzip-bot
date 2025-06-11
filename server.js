// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const APP_ID = process.env.SEATALK_APP_ID;
const APP_SECRET = process.env.SEATALK_APP_SECRET;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

let accessToken = null;

// ✅ Step 1: 交換 access_token
async function getAccessToken() {
  const res = await axios.post('https://openapi.seatalk.io/oauth2/token', {
    app_id: APP_ID,
    app_secret: APP_SECRET,
    grant_type: 'client_credentials'
  });
  accessToken = res.data.access_token;
  return accessToken;
}

// ✅ Step 2: 回覆訊息
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

// ✅ Step 3: 處理 webhook 請求
app.post('/webhook', async (req, res) => {
  console.log('✅ Received webhook');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  const body = req.body;

  // ✅ Step 3a: 處理驗證挑戰（首次驗證用）
  if (body.event_type === 'event_verification' && body.seatalk_challenge) {
    console.log('🔐 Seatalk challenge received:', body.seatalk_challenge);
    return res.json({ seatalk_challenge: body.seatalk_challenge });
  }

  const message = body.event?.message?.text?.content;
  if (!message) {
    console.log('⚠️ No message content');
    return res.sendStatus(200);
  }

  const match = message.match(/https:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view/);
  if (!match) {
    console.log('⚠️ Not a Google Drive link');
    return res.sendStatus(200);
  }

  const fileId = match[1];
  const zipUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  console.log('📦 Unzipping zip from URL:', zipUrl);

  try {
    const apiRes = await axios.post(APPS_SCRIPT_URL, { url: zipUrl });
    const folderUrl = apiRes.data.folderUrl || '⚠️ 無法取得資料夾';

    console.log('📁 解壓完成：', folderUrl);
    await replyTo(body.event, `✅ 解壓完成！請點擊：\n${folderUrl}`);
  } catch (err) {
    console.error('❌ 解壓錯誤:', err.message);
    await replyTo(body.event, '❌ 解壓失敗，請稍後再試或確認連結是否正確。');
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Seatalk MCP Bot running on port ${PORT}`);
});
