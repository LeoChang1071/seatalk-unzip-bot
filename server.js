require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const APP_ID = process.env.SEATALK_APP_ID;
const APP_SECRET = process.env.SEATALK_APP_SECRET;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const SIGNING_SECRET = process.env.SEATALK_SIGNING_SECRET;

let accessToken = null;

// === Access Token 換取 ===
async function getAccessToken() {
  const res = await axios.post('https://openapi.seatalk.io/oauth2/token', {
    app_id: APP_ID,
    app_secret: APP_SECRET,
    grant_type: 'client_credentials'
  });
  accessToken = res.data.access_token;
  return accessToken;
}

// === 發送訊息 ===
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

// === Webhook Entry Point ===
app.post('/', async (req, res) => {
  const body = req.body;

  // ✅ Step 1: 處理驗證請求
  if (body.event_type === 'event_verification') {
    const challenge = body.event?.seatalk_challenge;
    console.log('✅ Verification received. Challenge =', challenge);
    return res.status(200).json({ seatalk_challenge: challenge });
  }

  // ✅ Step 2: 處理一般訊息事件
  const message = body.event?.message?.text?.content;
  if (!message) return res.sendStatus(200);

  const match = message.match(/https:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view/);
  if (!match) return res.sendStatus(200);

  const fileId = match[1];
  const zipUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  try {
    console.log("📤 呼叫 Apps Script URL:", APPS_SCRIPT_URL);
    console.log("📦 傳送的 zip URL:", zipUrl);
    const apiRes = await axios.post(APPS_SCRIPT_URL, { url: zipUrl });
    console.log("📥 回傳結果：", apiRes.data);
    const folderUrl = apiRes.data.folderUrl || '無法取得資料夾';
    await replyTo(body.event, `✅ 解壓完成！請點擊：\n${folderUrl}`);
  } catch (err) {
    console.error('[❌ 解壓錯誤]', err.message);
    await replyTo(body.event, '❌ 解壓失敗，請稍後再試或確認連結是否正確。');
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Seatalk MCP Bot server running on port ${PORT}`);
});
