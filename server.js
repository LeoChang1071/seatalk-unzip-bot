const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

// Middleware：只針對 /webhook 使用 raw body（保留原始 JSON 字串）
app.use('/webhook', express.raw({ type: 'application/json' }));

// === 設定 ===
const SIGNING_SECRET = '4I8J-aV0J54uQD97rtODET9SIkG-GuFt';

// 驗證簽名
function isValidSignature(rawBodyBuffer, signature) {
  const combined = Buffer.concat([rawBodyBuffer, Buffer.from(SIGNING_SECRET)]);
  const digest = crypto.createHash('sha256').update(combined).digest('hex');
  return digest === signature;
}

// Webhook handler
app.post('/webhook', (req, res) => {
  const rawBody = req.body;
  const signature = req.headers['signature'];

  if (!isValidSignature(rawBody, signature)) {
    console.warn('❌ Invalid signature');
    return res.sendStatus(403);
  }

  const body = JSON.parse(rawBody);
  const eventType = body.event_type;

  // 處理驗證事件
  if (eventType === 'event_verification') {
    const challenge = body.event?.seatalk_challenge;
    console.log('✅ Verification request received');
    return res.status(200).json({ seatalk_challenge: challenge });
  }

  // 其他事件，先暫時只回應 200
  return res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Webhook server running on port ${PORT}`);
});
