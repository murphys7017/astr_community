const { pool } = require('../config/config');
const logger = require('./logger').child({ module: 'schema-migrations' });

async function ensurePostsCoverUrlColumn() {
  const [columns] = await pool.execute("SHOW COLUMNS FROM posts LIKE 'cover_url'");

  if (columns.length > 0) {
    return;
  }

  await pool.execute(
    "ALTER TABLE posts ADD COLUMN cover_url varchar(2048) DEFAULT NULL COMMENT '帖子外链封面URL' AFTER content"
  );
  logger.info('Schema migration applied', { migration: 'posts.cover_url' });
}

async function runSchemaMigrations() {
  await ensurePostsCoverUrlColumn();
}

module.exports = {
  runSchemaMigrations
};
