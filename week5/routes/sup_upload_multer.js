// routes/upload.js
const express = require('express');
const multer = require('multer');
const supabase = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // 把檔案存在 RAM 因為是存記憶體所以file有buffer

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    return res.status(200).json({
      status: 'success',
      url: publicUrl
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;

// 如果你想把圖片的 URL 存入資料庫（PostgreSQL），
// 可以把 publicUrl 一併存入 TypeORM 的實體欄位中，例如：
// await repo.save({ name: '小黑', avatar: publicUrl });
//一周沒用後要去手動啟用