-- 添加 GitHub ID 字段到用户表
USE `xiaoshiliu`;

-- 添加 github_id 字段
ALTER TABLE `users`
ADD COLUMN `github_id` varchar(100) DEFAULT NULL COMMENT 'GitHub 用户ID'
AFTER `id`;

-- 添加 github_id 唯一索引
ALTER TABLE `users` ADD UNIQUE KEY `idx_github_id` (`github_id`);

SELECT '数据库迁移完成！已添加 github_id 字段' AS message;
