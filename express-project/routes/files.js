const express = require('express');
const router = express.Router();
const fs = require('fs');
const { validateImageFile, validateVideoFile } = require('../utils/fileHelpers');
const { HTTP_STATUS, RESPONSE_CODES } = require('../constants');
const logger = require('../utils/logger').child({ module: 'files' });

router.get('/images/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const result = await validateImageFile(filename);

    if (!result.valid) {
      return res.status(result.statusCode).json({
        code: result.statusCode,
        message: '文件访问失败'
      });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.fileSize);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const fileStream = fs.createReadStream(result.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      logger.error('Read image file failed', { error: err, filename });
      if (!res.headersSent) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: RESPONSE_CODES.ERROR,
          message: '文件读取失败'
        });
      } else {
        res.destroy(err);
      }
      fileStream.destroy();
    });

    fileStream.on('close', () => {
      fileStream.destroy();
    });

    res.on('close', () => {
      fileStream.destroy();
    });
  } catch (error) {
    logger.error('Serve image failed', { error, filename: req.params.filename || null });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器错误'
    });
  }
});

router.get('/videos/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const result = await validateVideoFile(filename);

    if (!result.valid) {
      return res.status(result.statusCode).json({
        code: result.statusCode,
        message: '文件访问失败'
      });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.fileSize);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const fileStream = fs.createReadStream(result.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      logger.error('Read video file failed', { error: err, filename });
      if (!res.headersSent) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          code: RESPONSE_CODES.ERROR,
          message: '文件读取失败'
        });
      } else {
        res.destroy(err);
      }
      fileStream.destroy();
    });

    fileStream.on('close', () => {
      fileStream.destroy();
    });

    res.on('close', () => {
      fileStream.destroy();
    });
  } catch (error) {
    logger.error('Serve video failed', { error, filename: req.params.filename || null });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器错误'
    });
  }
});

module.exports = router;
