const express = require('express');
const router = express.Router();
const { success, error } = require('../utils/responseHelper');
const { getMultipleTableStats } = require('../utils/statsHelper');
const logger = require('../utils/logger').child({ module: 'stats' });

// 获取系统统计信息
router.get('/', async (req, res) => {
  try {
    // 定义需要统计的表
    const tables = [
      { table: 'users', alias: 'users' },
      { table: 'posts', alias: 'posts' },
      { table: 'comments', alias: 'comments' },
      { table: 'likes', alias: 'likes' }
    ];

    const stats = await getMultipleTableStats(tables);
    success(res, stats, '获取统计信息成功');
  } catch (err) {
    logger.error('Get stats failed', { error: err });
    error(res, '获取统计信息失败');
  }
});

module.exports = router;
