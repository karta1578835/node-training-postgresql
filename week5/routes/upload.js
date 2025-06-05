
const express = require('express')

const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Upload')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

//檔案上傳邏輯
const formidable = require('formidable')
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB    //檔案大小
const ALLOWED_FILE_TYPES = {    //接受格式
  'image/jpeg': true,
  'image/png': true
}

//firebase初始化跟打開bucket
const firebaseAdmin = require('firebase-admin')
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(config.get('secret.firebase.serviceAccount')),
  storageBucket: config.get('secret.firebase.storageBucket')
})

const bucket = firebaseAdmin.storage().bucket()

const router = express.Router()

router.post('/', auth, async  (req, res, next)=> {
    try {
      const form = formidable.formidable({//上傳條件
        multiple: false,//多個檔案上傳
        maxFileSize: MAX_FILE_SIZE,//最大檔案
        filter: ({ mimetype }) => {
          return !!ALLOWED_FILE_TYPES[mimetype]//允許那些檔案格式
        }
      })
      const [fields, files] = await form.parse(req)
      logger.info('files')
      logger.info(files)
      logger.info('fields')
      logger.info(fields)
      const filePath = files.file[0].filepath//檔案路徑
      const remoteFilePath = `images/${new Date().toISOString()}-${files.file[0].originalFilename}`//重新設計路徑名稱避免撞名
      await bucket.upload(filePath, { destination: remoteFilePath })//將本地檔案上傳到 Firebase Storage，並放到指定的 remoteFilePath。
      const options = {//產生檔案存取連結
        action: 'read',//可讀取檔案
        expires: Date.now() + 24 * 60 * 60 * 1000//過期時間24h
      }
      const [imageUrl] = await bucket.file(remoteFilePath).getSignedUrl(options)//存入 Firebase Storage 檔案的「簽名 URL」，讓客戶端能直接存取檔案。
      logger.info(imageUrl)
      res.status(200).json({
        status: 'success',
        data: {
          image_url: imageUrl
        }
      })
    } catch (error) {
      logger.error(error)
      next(error)
    }
  })

module.exports = router
