app.post('/webhook', async (req, res) => {
  console.log("↩️ Webhook POST received");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body.toString());

  const body = req.body;

  // ✅ Step 1：處理 Seatalk 驗證事件
  if (body.event_type === 'event_verification') {
    const challenge = body.event?.seatalk_challenge;
    console.log("🎯 Verification challenge =", challenge);
    return res.status(200).json({ seatalk_challenge: challenge });
  }

  // ✅ Step 2：處理正常訊息事件
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
