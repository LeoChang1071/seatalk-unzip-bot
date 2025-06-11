const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body?.event_type === 'event_verification') {
    const challenge = body.event?.seatalk_challenge;
    if (!challenge) return res.status(400).send('Missing challenge');
    return res.status(200).json({ seatalk_challenge: challenge });
  }

  // 其他事件回應 200 即可
  return res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook verification server running on port ${PORT}`);
});
