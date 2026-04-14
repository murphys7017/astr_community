const config = require('../config/config');

/**
 * 获取IP属地信息（已禁用外部API查询）
 * @param {string} ip - IP地址
 * @returns {Promise<string>} 返回固定值
 */
async function getIPLocation(ip) {
  // 直接返回固定值，不调用外部API
  return '未知';
}

/**
 * 从请求中获取真实IP地址
 * @param {Object} req - Express请求对象
 * @returns {string} IP地址
 */
function getRealIP(req) {
  let ip = req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    req.ip;

  // 处理IPv4映射的IPv6地址格式，去掉::ffff:前缀
  if (ip && typeof ip === 'string' && ip.startsWith('::ffff:')) {
    ip = ip.substring(7); // 去掉'::ffff:'前缀
  }

  // 如果是x-forwarded-for头，可能包含多个IP，取第一个
  if (ip && typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  return ip;
}

module.exports = {
  getIPLocation,
  getRealIP
};