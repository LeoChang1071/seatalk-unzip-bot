const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// === 下面填你的設定 ===
const SEATALK_WEBHOOK_URL = 'https://openapi.seatalk.io/webhook/group/fX-Q69KmTgWv3GgUMrHkug';
const APPS_SCRIPT_API = 'https://script.google.com/a/macros/garena.com/s/AKfycbyH-h-IXe18fqRWdwzzCEWpVwFXMHlNbQd205xoo3ZT7bnGEPwZgkGvYzblg2wS3rDCDw/exec';

const DRIVE_REGEX = /https:\/\/drive\\.google\\.com\\/file\\/d\\/([\\w-]+)\\/view/g;

app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message?.text?.content;
    if (!message) return res.sendStatus(200);

    const match = DRIVE_REGEX.exec(message);
    if (!match || !match[1]) return res.sendStatus(200);

    const fileId = match[1];
    const zipUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const apiRes = await axios.post(APPS_SCRIPT_API, { url: zipUrl });
    const folderUrl = apiRes.data.folderUrl || '無法取得資料夾';

    const reply = {
      tag: 'text',
      text: {
        content: `✅ 解壓完成！請點擊：\n${folderUrl}`
      }
    };

    await axios.post(SEATALK_WEBHOOK_URL, reply);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook listening on port ${PORT}`));
