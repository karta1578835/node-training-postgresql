const express = require('express');
const formidable = require('formidable');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const supabase = require('../lib/supabase');

const router = express.Router();

router.post('/upload', async (req, res) => {
  const form = new formidable.IncomingForm({ 
    multiples: false,
    keepExtensions: true
  });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      const file = files.file?.[0] || files.avatar?.[0];
      if (!file) {
        return res.status(400).json({ status: 'error', message: '找不到上傳的檔案' });
      }

      const fileExt = file.originalFilename?.split('.').pop();
      if (!fileExt) {
        return res.status(400).json({ status: 'error', message: '檔案沒有副檔名' });
      }

      const fileName = `${uuidv4()}.${fileExt}`;
      const fileBuffer = await fs.promises.readFile(file.filepath);//Formidable 預設會存硬碟所以沒buffer,是最穩定且簡單的方法

      const { error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(fileName, fileBuffer, {
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
});

module.exports = router;
