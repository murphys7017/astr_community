const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES } = require('../constants');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { uploadFile, uploadVideo } = require('../utils/uploadHelper');
const { parseSize } = require('../utils/fileHelpers');
const config = require('../config/config');
const logger = require('../utils/logger').child({ module: 'upload' });

const UPLOAD_DISABLED_MESSAGE = '平台当前已关闭文件上传，请改用外链内容';

// 配置 multer 内存存储（用于云端图床）
const storage = multer.memoryStorage();

// 文件过滤器 - 图片
const imageFileFilter = (req, file, cb) => {
  // 检查文件类型
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

// 文件过滤器 - 视频
const videoFileFilter = (req, file, cb) => {
  // 检查文件类型
  const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传视频文件'), false);
  }
};

// 配置 multer - 图片
const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: parseSize(config.upload.image.maxSize)
  }
});

// 配置 multer - 视频
// 混合文件过滤器（支持视频和图片）
const mixedFileFilter = (req, file, cb) => {
  if (file.fieldname === 'file') {
    // 视频文件验证
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持视频文件'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    // 缩略图文件验证
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('缩略图只支持图片文件'), false);
    }
  } else {
    cb(new Error('不支持的文件字段'), false);
  }
};

const videoUpload = multer({
  storage: storage,
  fileFilter: mixedFileFilter, // 使用混合文件过滤器
  limits: {
    fileSize: parseSize(config.upload.video.maxSize) // 100MB 限制
  }
});

// 单图片上传到图床
router.post('/single', authenticateToken, async (req, res) => {
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    code: RESPONSE_CODES.VALIDATION_ERROR,
    message: UPLOAD_DISABLED_MESSAGE
  });
});

// 多图片上传到图床
router.post('/multiple', authenticateToken, async (req, res) => {
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    success: false,
    data: null,
    message: UPLOAD_DISABLED_MESSAGE
  });
});

// 单视频上传到图床
router.post('/video', authenticateToken, async (req, res) => {
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    code: RESPONSE_CODES.VALIDATION_ERROR,
    message: UPLOAD_DISABLED_MESSAGE
  });
});

// 注意：使用云端图床后，文件删除由图床服务商管理

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: `文件大小超过限制（图片：${config.upload.image.maxSize}，视频：${config.upload.video.maxSize}）` });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '文件数量超过限制（9个）' });
    }
  }

  if (error.message === '只允许上传图片文件' || error.message === '只允许上传视频文件') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: error.message });
  }

  logger.error('File upload failed', { error, userId: req.user?.id || null });
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: '文件上传失败' });
});

module.exports = router;
