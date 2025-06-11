const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use('/webhook', express.raw({ type: 'application/json' }));

// === 設定 ===
const SIGNING_SECRET = '4I8J-aV0J54uQD97rtODET9SIkG-GuFt';
const APPS_SCRIPT_API = 'https://script.google.com/a/macros/garena.com/s/AKfycbyH-h-IXe18fqRWdwzzCEWpVwFXMHlNbQd205xoo3ZT7bnGEPwZgkGvYzblg2wS3rDCDw/exec';
const SEATALK_REPLY_WEBHOOK = 'https://openapi.seatalk.io/webhook/group/fX-Q69KmTgWv3GgUMrHkug';

// === 簽名驗證 ===
function isValidSignature(rawBodyBuffer, signature) {
  const combined = Buffer.concat([rawBodyBuffer, Buffer.from(SIGNING_SECRET)]);
  const digest = crypto.createHash('sha256').update(combined).digest('hex');
  return digest === signature;
}

// === webhook handler ===
app.post('/webhook', async (req, res) => {
  const rawBody = req.body;
  const signature = req.headers['signature'];
  if (!isValidSignature(rawBody, signature)) {
    console.warn('❌ Invalid signature');
    return res.sendStatus(403);
  }

  const body = JSON.parse(rawBody);
  const eventType = body.event_type;

  // ✅ Step 1: 驗證 callback
  if (eventType === 'event_verification') {
    const challenge = body.event?.seatalk_challenge;
    return res.status(200).json({ seatalk_challenge: challenge });
  }

  // ✅ Step 2: 收到提及 Bot 的訊息
  if (eventType === 'new_mentioned_message_received_from_group_chat') {
    const message = body.event?.message?.text?.content || '';
    const match = message.match(/https:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view/);
    if (!match) return res.sendStatus(200);

    const fileId = match[1];
    const zipUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    try {
      // ✅ 呼叫 Google Apps Script API 解壓縮
      const apiRes = await axios.post(APPS_SCRIPT_API, { url: zipUrl });
      const folderUrl = apiRes.data.folderUrl || '無法取得資料夾';

      // ✅ 回傳訊息到 SeaTalk
      const reply = {
        tag: 'text',
        text: {
          content: `✅ 解壓完成！請點擊：\n${folderUrl}`
        }
      };
      await axios.post(SEATALK_REPLY_WEBHOOK, reply);

      res.sendStatus(200);
    } catch (err) {
      console.error('❌ 解壓或回傳失敗：', err.message);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Webhook server running on port ${PORT}`);
});
