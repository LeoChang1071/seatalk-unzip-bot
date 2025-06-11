const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// === 設定區 ===
const SIGNING_SECRET = '4I8J-aV0J54uQD97rtODET9SIkG-GuFt';
const SEATALK_WEBHOOK_URL = 'https://openapi.seatalk.io/webhook/group/fX-Q69KmTgWv3GgUMrHkug';
const APPS_SCRIPT_API = 'https://script.google.com/a/macros/garena.com/s/AKfycbyH-h-IXe18fqRWdwzzCEWpVwFXMHlNbQd205xoo3ZT7bnGEPwZgkGvYzblg2wS3rDCDw/exec';

function isValidSignature(rawBody, signature) {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.concat([Buffer.from(rawBody), Buffer.from(SIGNING_SECRET)]));
  const digest = hash.digest('hex');
  return digest === signature;
}

// 處理 Seatalk webhook
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body;
  const signature = req.headers['signature'];

  // 驗證簽名
  if (!isValidSignature(rawBody, signature)) {
    console.warn('Signature mismatch');
    return res.sendStatus(403);
  }

  const json = JSON.parse(rawBody);
  const eventType = json.event_type;

  // 處理驗證請求
  if (eventType === 'event_verification') {
    const challenge = json.event?.seatalk_challenge;
    return res.status(200).json({ seatalk_challenge: challenge });
  }

  // 正式處理 bot 事件（如 new_mentioned_message_received_from_group_chat）
  if (eventType === 'new_mentioned_message_received_from_group_chat') {
    const message = json.event?.message?.text?.content || '';
    const match = message.match(/https:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view/);
    if (!match) return res.sendStatus(200);

    const fileId = match[1];
    const zipUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    axios.post(APPS_SCRIPT_API, { url: zipUrl })
      .then(apiRes => {
        const folderUrl = apiRes.data.folderUrl || '無法取得資料夾';
        return axios.post(SEATALK_WEBHOOK_URL, {
          tag: 'text',
          text: {
            content: `✅ 解壓完成！請點擊：\n${folderUrl}`
          }
        });
      })
      .then(() => res.sendStatus(200))
      .catch(err => {
        console.error(err);
        res.sendStatus(500);
      });
  } else {
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Seatalk webhook server running on port ${PORT}`);
});
