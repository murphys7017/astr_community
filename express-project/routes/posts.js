const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES, ERROR_MESSAGES } = require('../constants');
const { pool } = require('../config/config');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const NotificationHelper = require('../utils/notificationHelper');
const { batchCleanupFiles } = require('../utils/fileCleanup');
const { sanitizeContent } = require('../utils/contentSecurity');
const { parseExternalCoverUrl, pickTextPostCoverUrl } = require('../utils/postCover');
const logger = require('../utils/logger').child({ module: 'posts' });

const BLOCKED_MEDIA_TAG_REGEX = /<(img|video|audio|iframe)\b/i;

const hasEmbeddedMediaMarkup = (content = '') => BLOCKED_MEDIA_TAG_REGEX.test(content);

const hasUploadedMediaPayload = (payload = {}) => {
  const { images, video, type, video_url } = payload;
  const hasImages = Array.isArray(images) && images.some(imageUrl => typeof imageUrl === 'string' && imageUrl.trim());
  const hasVideoObject = video && typeof video === 'object' &&
    Object.values(video).some(value => typeof value === 'string' ? value.trim() : Boolean(value));
  const hasVideoString = typeof video === 'string' && video.trim();
  const hasSeparateVideoField = typeof video_url === 'string' && video_url.trim();
  const isVideoType = Number(type) === 2;

  return hasImages || hasVideoObject || hasVideoString || hasSeparateVideoField || isVideoType;
};

const RECOMMENDATION_SMALL_SITE_THRESHOLD = 12;
const RECOMMENDATION_MIN_POOL_SIZE = 12;
const RECOMMENDATION_POOL_RATIO = 0.35;
const RECOMMENDATION_SCORE_SQL = `
  (
    LOG10(p.view_count + 1) * 1.5 +
    p.like_count * 3 +
    p.comment_count * 4 +
    p.collect_count * 5 +
    GREATEST(0, 72 - LEAST(TIMESTAMPDIFF(HOUR, p.created_at, NOW()), 72)) * 0.15
  )
`;

const getRecommendPoolSize = (totalPosts) => {
  if (totalPosts <= 0) {
    return 0;
  }

  if (totalPosts <= RECOMMENDATION_SMALL_SITE_THRESHOLD) {
    return totalPosts;
  }

  return Math.min(
    totalPosts,
    Math.max(RECOMMENDATION_MIN_POOL_SIZE, Math.ceil(totalPosts * RECOMMENDATION_POOL_RATIO))
  );
};

// 获取笔记列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const status = req.query.status !== undefined ? parseInt(req.query.status) : 0;
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;
    const type = req.query.type ? parseInt(req.query.type) : null;
    const currentUserId = req.user ? req.user.id : null;

    if (status === 1) {
      if (!currentUserId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ code: RESPONSE_CODES.UNAUTHORIZED, message: '查看草稿需要登录' });
      }
      const forcedUserId = currentUserId;

      let query = `
        SELECT p.*, u.nickname, u.avatar as user_avatar, u.user_id as author_account, u.id as author_auto_id, u.location, u.verified, c.name as category
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = ? AND p.user_id = ?
      `;
      let queryParams = [status.toString(), forcedUserId.toString()];

      if (category) {
        query += ` AND p.category_id = ?`;
        queryParams.push(category);
      }

      if (type) {
        query += ` AND p.type = ?`;
        queryParams.push(type);
      }

      query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit.toString(), offset.toString());


      const [rows] = await pool.execute(query, queryParams);

      // 获取每个草稿的图片和标签
      for (let post of rows) {
        // 根据笔记类型获取图片或视频封面
        if (post.type === 2) {
          // 视频笔记：获取视频封面
          const [videos] = await pool.execute('SELECT video_url, cover_url FROM post_videos WHERE post_id = ?', [post.id]);
          post.images = videos.length > 0 && videos[0].cover_url ? [videos[0].cover_url] : [];
          post.video_url = videos.length > 0 ? videos[0].video_url : null;
          // 为瀑布流设置image字段
          post.image = videos.length > 0 && videos[0].cover_url ? videos[0].cover_url : null;
        } else {
          // 图文笔记：获取笔记图片
          const [images] = await pool.execute('SELECT image_url FROM post_images WHERE post_id = ?', [post.id]);
          post.images = images.map(img => img.image_url);
          // 为瀑布流设置image字段（取第一张图片）
          post.image = pickTextPostCoverUrl(post.cover_url, post.images);
        }

        // 获取笔记标签
        const [tags] = await pool.execute(
          'SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?',
          [post.id]
        );
        post.tags = tags;

        // 草稿不需要点赞收藏状态
        post.liked = false;
        post.collected = false;
      }

      // 获取草稿总数
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM posts p WHERE p.status = ? AND p.user_id = ?' +
        (category ? ' AND p.category_id = ?' : '') +
        (type ? ' AND p.type = ?' : ''),
        [status.toString(), forcedUserId.toString(), ...(category ? [category] : []), ...(type ? [type] : [])]
      );
      const total = countResult[0].total;
      const pages = Math.ceil(total / limit);

      return res.json({
        code: RESPONSE_CODES.SUCCESS,
        message: 'success',
        data: {
          posts: rows,
          pagination: {
            page,
            limit,
            total,
            pages
          }
        }
      });
    }

    let query = `
      SELECT p.*, u.nickname, u.avatar as user_avatar, u.user_id as author_account, u.id as author_auto_id, u.location, u.verified, c.name as category
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = ?
    `;
    let queryParams = [status.toString()];

    // 推荐频道：小站阶段放开更多内容，大站阶段按综合热度池排序
    if (category === 'recommend') {
      // 先获取总笔记数，再决定推荐池大小
      let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE status = ?';
      let countParams = [status.toString()];

      if (type) {
        countQuery += ' AND type = ?';
        countParams.push(type);
      }
      const [totalCountResult] = await pool.execute(countQuery, countParams);
      const totalPosts = totalCountResult[0].total;
      const recommendLimit = getRecommendPoolSize(totalPosts);
      // 推荐算法：互动质量为主，新鲜度兜底，浏览量仅提供轻量加权
      let innerWhere = 'p.status = ?';
      let innerParams = [status.toString()];
      if (type) {
        innerWhere += ' AND p.type = ?';
        innerParams.push(type);
      }
      query = `
        SELECT 
          p.*, 
          u.nickname, 
          u.avatar as user_avatar, 
          u.user_id as author_account, 
          u.id as author_auto_id, 
          u.location, 
          u.verified,
          c.name as category
        FROM (
          SELECT 
            p.*,
            ${RECOMMENDATION_SCORE_SQL} as score
          FROM posts p 
          WHERE ${innerWhere}
          ORDER BY score DESC
          LIMIT ?
        ) p
        LEFT JOIN users u ON p.user_id = u.id 
        LEFT JOIN categories c ON p.category_id = c.id 
        ORDER BY p.score DESC
        LIMIT ? OFFSET ? 
      `;

      // 参数设置
      queryParams = [
        ...innerParams,
        recommendLimit.toString(),
        limit.toString(),
        offset.toString()
      ];
    } else {
      let whereConditions = [];
      let additionalParams = [];

      if (category) {
        whereConditions.push('p.category_id = ?');
        additionalParams.push(category);
      }

      if (userId) {
        whereConditions.push('p.user_id = ?');
        additionalParams.push(userId);
      }

      if (type) {
        whereConditions.push('p.type = ?');
        additionalParams.push(type);
      }

      if (whereConditions.length > 0) {
        query += ` AND ${whereConditions.join(' AND ')}`;
      }

      query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
      queryParams = [status.toString(), ...additionalParams, limit.toString(), offset.toString()];
    }
    const [rows] = await pool.execute(query, queryParams);


    // 获取每个笔记的图片、标签和用户点赞收藏状态
    for (let post of rows) {
      // 根据笔记类型获取图片或视频封面
      if (post.type === 2) {
        // 视频笔记：获取视频封面
        const [videos] = await pool.execute('SELECT video_url, cover_url FROM post_videos WHERE post_id = ?', [post.id]);
        post.images = videos.length > 0 && videos[0].cover_url ? [videos[0].cover_url] : [];
        post.video_url = videos.length > 0 ? videos[0].video_url : null;
        // 为瀑布流设置image字段
        post.image = videos.length > 0 && videos[0].cover_url ? videos[0].cover_url : null;
      } else {
        // 图文笔记：获取笔记图片
        const [images] = await pool.execute('SELECT image_url FROM post_images WHERE post_id = ?', [post.id]);
        post.images = images.map(img => img.image_url);
        // 为瀑布流设置image字段（取第一张图片）
        post.image = pickTextPostCoverUrl(post.cover_url, post.images);
      }

      // 获取笔记标签
      const [tags] = await pool.execute(
        'SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?',
        [post.id]
      );
      post.tags = tags;

      // 检查当前用户是否已点赞（仅在用户已登录时检查）
      if (currentUserId) {
        const [likeResult] = await pool.execute(
          'SELECT id FROM likes WHERE user_id = ? AND target_type = 1 AND target_id = ?',
          [currentUserId, post.id]
        );
        post.liked = likeResult.length > 0;

        // 检查当前用户是否已收藏
        const [collectResult] = await pool.execute(
          'SELECT id FROM collections WHERE user_id = ? AND post_id = ?',
          [currentUserId, post.id]
        );
        post.collected = collectResult.length > 0;
      } else {
        post.liked = false;
        post.collected = false;
      }
    }

    // 获取总数
    let total;
    if (category === 'recommend') {
      // 推荐频道的总数等于推荐池大小，而不是简单的 20%
      let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE status = ?';
      let countParams = [status.toString()];

      if (type) {
        countQuery += ' AND type = ?';
        countParams.push(type);
      }

      const [totalCountResult] = await pool.execute(countQuery, countParams);
      const totalPosts = totalCountResult[0].total;
      total = getRecommendPoolSize(totalPosts);
    } else {
      let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE status = ?';
      let countParams = [status.toString()];
      let countWhereConditions = [];

      if (category) {
        countQuery = 'SELECT COUNT(*) as total FROM posts p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ?';
        countWhereConditions.push('p.category_id = ?');
        countParams.push(category);
      }

      if (userId) {
        countWhereConditions.push('user_id = ?');
        countParams.push(userId);
      }

      if (type) {
        countWhereConditions.push('type = ?');
        countParams.push(type);
      }

      if (countWhereConditions.length > 0) {
        countQuery += ` AND ${countWhereConditions.join(' AND ')}`;
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      total = countResult[0].total;
    }

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        posts: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get posts failed', { error });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 获取笔记详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    // 获取笔记基本信息
    const [rows] = await pool.execute(
      `SELECT p.*, u.nickname, u.avatar as user_avatar, u.user_id as author_account, u.id as author_auto_id, u.location, u.verified, c.name as category
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [postId]
    );

    if (rows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '笔记不存在' });
    }

    const post = rows[0];

    // 检查笔记状态权限
    // status: 0=已发布, 1=草稿, 2=待审核, 3=未过审
    // 只有已发布的笔记可以公开访问，其他状态的笔记只有作者本人可以查看
    if (post.status !== 0) {
      // 未发布的笔记，检查是否是作者本人
      if (!currentUserId || currentUserId !== post.user_id) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '笔记不存在' });
      }
    }

    // 根据帖子类型获取对应的媒体文件
    if (post.type === 1) {
      // 图文类型：获取图片
      const [images] = await pool.execute('SELECT image_url FROM post_images WHERE post_id = ?', [postId]);
      post.images = images.map(img => img.image_url);
      post.image = pickTextPostCoverUrl(post.cover_url, post.images);
    } else if (post.type === 2) {
      // 视频类型：获取视频
      const [videos] = await pool.execute('SELECT video_url, cover_url FROM post_videos WHERE post_id = ?', [postId]);
      post.videos = videos;
      // 将第一个视频的URL和封面提取到主对象中，方便前端使用
      if (videos.length > 0) {
        post.video_url = videos[0].video_url;
        post.cover_url = videos[0].cover_url;
      }
    }

    // 获取笔记标签
    const [tags] = await pool.execute(
      'SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?',
      [postId]
    );
    post.tags = tags;

    // 检查当前用户是否已点赞和收藏（仅在用户已登录时检查）
    if (currentUserId) {
      const [likeResult] = await pool.execute(
        'SELECT id FROM likes WHERE user_id = ? AND target_type = 1 AND target_id = ?',
        [currentUserId, postId]
      );
      post.liked = likeResult.length > 0;

      const [collectResult] = await pool.execute(
        'SELECT id FROM collections WHERE user_id = ? AND post_id = ?',
        [currentUserId, postId]
      );
      post.collected = collectResult.length > 0;
    } else {
      post.liked = false;
      post.collected = false;
    }

    // 检查是否跳过浏览量增加
    const skipViewCount = req.query.skipViewCount === 'true';

    if (!skipViewCount) {
      // 增加浏览量
      await pool.execute('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [postId]);
      post.view_count = post.view_count + 1;
    }


    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: post
    });
  } catch (error) {
    logger.error('Get post detail failed', { error, postId: req.params.id });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 创建笔记
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, category_id, images, video, cover_url, tags, status, type } = req.body;
    const userId = req.user.id;
    const postType = 1;
    const normalizedCoverUrl = parseExternalCoverUrl(cover_url);

    logger.info('Post creation requested', {
      userId,
      categoryId: category_id || null,
      postType,
      status: status !== undefined ? status : 0,
      titleLength: title ? title.length : 0,
      contentLength: content ? content.length : 0,
      tagCount: Array.isArray(tags) ? tags.length : 0,
      hasCoverUrl: Boolean(normalizedCoverUrl.value),
      hasUploadedMedia: hasUploadedMediaPayload({ images, video, type })
    });

    // 验证必填字段：发布时要求标题和内容，草稿时不强制要求
    if (status !== 1 && (!title || !content)) {
      logger.warn('Post creation rejected: missing required fields', {
        userId,
        status: status !== undefined ? status : 0,
        hasTitle: Boolean(title),
        hasContent: Boolean(content)
      });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '发布时标题和内容不能为空' });
    }

    // 对内容进行安全过滤，防止XSS攻击
    const sanitizedContent = content ? sanitizeContent(content) : '';

    if (hasEmbeddedMediaMarkup(sanitizedContent)) {
      logger.warn('Post creation rejected: embedded media markup blocked', { userId });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '帖子内容暂不支持图片或媒体嵌入，请改用外链'
      });
    }

    if (!normalizedCoverUrl.valid) {
      logger.warn('Post creation rejected: invalid cover url', { userId, coverUrl: cover_url || null });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '封面链接格式不正确，请使用 http/https 链接'
      });
    }

    if (hasUploadedMediaPayload({ images, video, type })) {
      logger.warn('Post creation rejected: uploaded media not allowed', { userId });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '平台当前仅支持纯文本发帖，图片和视频请改用外链'
      });
    }

    // 插入笔记
    const [result] = await pool.execute(
      'INSERT INTO posts (user_id, title, content, cover_url, category_id, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, title || '', sanitizedContent, normalizedCoverUrl.value, category_id || null, (status !== undefined ? status : 0).toString(), postType]
    );

    const postId = result.insertId;

    // 处理标签
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // 检查标签是否存在，不存在则创建
        let [tagRows] = await pool.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
        let tagId;

        if (tagRows.length === 0) {
          const [tagResult] = await pool.execute('INSERT INTO tags (name) VALUES (?)', [tagName]);
          tagId = tagResult.insertId;
        } else {
          tagId = tagRows[0].id;
        }

        // 关联笔记和标签
        await pool.execute('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId.toString(), tagId.toString()]);

        // 更新标签使用次数
        await pool.execute('UPDATE tags SET use_count = use_count + 1 WHERE id = ?', [tagId.toString()]);
      }
    }

    logger.info('Post created', {
      userId,
      postId,
      postType,
      status: status !== undefined ? status : 0,
      tagCount: Array.isArray(tags) ? tags.length : 0,
      hasCoverUrl: Boolean(normalizedCoverUrl.value)
    });

    // 如果笔记状态为待审核(status=2)，在audit表中添加审核记录
    if (status === 2) {
      try {
        await pool.execute(
          'INSERT INTO audit (type, target_id, status) VALUES (?, ?, ?)',
          [3, postId, 0]
        );
        logger.info('Post audit record created', { postId });
      } catch (error) {
        logger.error('Create post audit record failed', { error, postId });
      }
    }

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '发布成功',
      data: { id: postId }
    });
  } catch (error) {
    logger.error('Create post failed', { error, userId: req.user?.id || null });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 搜索笔记
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const keyword = req.query.keyword;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const currentUserId = req.user ? req.user.id : null;

    if (!keyword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '请输入搜索关键词' });
    }

    logger.debug('Post search requested', {
      keyword,
      page,
      limit,
      currentUserId
    });

    // 搜索笔记：支持标题和内容搜索（只搜索已通过的笔记）
    const [rows] = await pool.execute(
      `SELECT p.*, u.nickname, u.avatar as user_avatar, u.user_id as author_account, u.id as author_auto_id, u.location, u.verified
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.status = 0 AND (p.title LIKE ? OR p.content LIKE ?)
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [`%${keyword}%`, `%${keyword}%`, limit.toString(), offset.toString()]
    );

    // 获取每个笔记的图片、标签和用户点赞收藏状态
    for (let post of rows) {
      // 获取笔记图片
      const [images] = await pool.execute('SELECT image_url FROM post_images WHERE post_id = ?', [post.id]);
      post.images = images.map(img => img.image_url);
      post.image = pickTextPostCoverUrl(post.cover_url, post.images);

      // 获取笔记标签
      const [tags] = await pool.execute(
        'SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?',
        [post.id]
      );
      post.tags = tags;

      // 检查当前用户是否已点赞和收藏（仅在用户已登录时检查）
      if (currentUserId) {
        const [likeResult] = await pool.execute(
          'SELECT id FROM likes WHERE user_id = ? AND target_type = 1 AND target_id = ?',
          [currentUserId, post.id]
        );
        post.liked = likeResult.length > 0;

        const [collectResult] = await pool.execute(
          'SELECT id FROM collections WHERE user_id = ? AND post_id = ?',
          [currentUserId, post.id]
        );
        post.collected = collectResult.length > 0;
      } else {
        post.liked = false;
        post.collected = false;
      }
    }

    // 获取总数（只统计已通过的笔记）
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM posts 
       WHERE status = 0 AND (title LIKE ? OR content LIKE ?)`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    const total = countResult[0].total;

    logger.info('Post search completed', {
      keyword,
      page,
      limit,
      currentUserId,
      total,
      resultCount: rows.length
    });

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        posts: rows,
        keyword,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Search posts failed', { error, keyword: req.query.keyword || null });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 获取笔记评论列表
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || 'desc'; // 排序方式：desc（降序）或 asc（升序）
    const currentUserId = req.user ? req.user.id : null;

    logger.debug('Get post comments requested', {
      postId,
      page,
      limit,
      sort,
      currentUserId
    });

    // 验证笔记是否存在
    const [postRows] = await pool.execute('SELECT id FROM posts WHERE id = ?', [postId.toString()]);
    if (postRows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '笔记不存在' });
    }

    // 获取顶级评论（parent_id为NULL）
    const orderBy = sort === 'asc' ? 'ASC' : 'DESC';
    const [rows] = await pool.execute(
      `SELECT c.*, u.nickname, u.avatar as user_avatar, u.id as user_auto_id, u.user_id as user_display_id, u.location as user_location, u.verified
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.parent_id IS NULL
       ORDER BY c.created_at ${orderBy}
       LIMIT ? OFFSET ?`,
      [postId, limit.toString(), offset.toString()]
    );

    // 为每个评论检查点赞状态
    for (let comment of rows) {
      if (currentUserId) {
        const [likeResult] = await pool.execute(
          'SELECT id FROM likes WHERE user_id = ? AND target_type = 2 AND target_id = ?',
          [currentUserId, comment.id]
        );
        comment.liked = likeResult.length > 0;
      } else {
        comment.liked = false;
      }

      // 获取子评论数量
      const [childCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM comments WHERE parent_id = ?',
        [comment.id]
      );
      comment.reply_count = childCount[0].count;
    }

    // 获取总数（直接从posts表读取comment_count字段）
    const [countResult] = await pool.execute(
      'SELECT comment_count as total FROM posts WHERE id = ?',
      [postId]
    );
    const total = countResult[0].total;


    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        comments: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get post comments failed', { error, postId: req.params.id || req.query.post_id || null });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});



// 收藏/取消收藏笔记
router.post('/:id/collect', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // 验证笔记是否存在
    const [postRows] = await pool.execute('SELECT id FROM posts WHERE id = ?', [postId]);
    if (postRows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '笔记不存在' });
    }

    // 检查是否已经收藏
    const [existingCollection] = await pool.execute(
      'SELECT id FROM collections WHERE user_id = ? AND post_id = ?',
      [userId.toString(), postId.toString()]
    );

    if (existingCollection.length > 0) {
      // 已收藏，执行取消收藏
      await pool.execute(
        'DELETE FROM collections WHERE user_id = ? AND post_id = ?',
        [userId.toString(), postId.toString()]
      );

      // 更新笔记收藏数
      await pool.execute('UPDATE posts SET collect_count = collect_count - 1 WHERE id = ?', [postId.toString()]);

      logger.info('Post collection removed', { userId, postId });
      res.json({ code: RESPONSE_CODES.SUCCESS, message: '取消收藏成功', data: { collected: false } });
    } else {
      // 未收藏，执行收藏
      await pool.execute(
        'INSERT INTO collections (user_id, post_id) VALUES (?, ?)',
        [userId.toString(), postId.toString()]
      );

      // 更新笔记收藏数
      await pool.execute('UPDATE posts SET collect_count = collect_count + 1 WHERE id = ?', [postId.toString()]);

      // 获取笔记作者ID，用于创建通知
      const [postResult] = await pool.execute('SELECT user_id FROM posts WHERE id = ?', [postId.toString()]);
      if (postResult.length > 0) {
        const targetUserId = postResult[0].user_id;

        // 创建通知（不给自己发通知）
        if (targetUserId && targetUserId !== userId) {
          const notificationData = NotificationHelper.createCollectPostNotification(targetUserId, userId, postId);
          const notificationResult = await NotificationHelper.insertNotification(pool, notificationData);
        }
      }

      logger.info('Post collected', { userId, postId });
      res.json({ code: RESPONSE_CODES.SUCCESS, message: '收藏成功', data: { collected: true } });
    }
  } catch (error) {
    logger.error('Toggle post collection failed', { error, postId: req.params.id, userId: req.user?.id || null });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 更新笔记
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, content, category_id, images, video, video_url, cover_url, tags, status, type } = req.body;
    const userId = req.user.id;
    const normalizedCoverUrl = parseExternalCoverUrl(cover_url);

    // 验证必填字段：如果不是草稿（status=2），则要求标题、内容和分类不能为空
    if (status !== 1 && (!title || !content || !category_id)) {
      logger.warn('Post update rejected: missing required fields', {
        userId,
        postId,
        status: status !== undefined ? status : 0,
        hasTitle: Boolean(title),
        hasContent: Boolean(content),
        hasCategoryId: Boolean(category_id)
      });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '发布时标题、内容和分类不能为空' });
    }
    const sanitizedContent = content ? sanitizeContent(content) : '';

    if (hasEmbeddedMediaMarkup(sanitizedContent)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '帖子内容暂不支持图片或媒体嵌入，请改用外链'
      });
    }

    if (!normalizedCoverUrl.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '封面链接格式不正确，请使用 http/https 链接'
      });
    }

    // 检查笔记是否存在且属于当前用户
    const [postRows] = await pool.execute(
      'SELECT user_id, type FROM posts WHERE id = ?',
      [postId.toString()]
    );

    if (postRows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '笔记不存在' });
    }

    if (postRows[0].user_id !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ code: RESPONSE_CODES.FORBIDDEN, message: '无权限修改此笔记' });
    }

    if (hasUploadedMediaPayload({ images, video, type, video_url })) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '平台当前仅支持纯文本帖子，暂不支持修改图片或视频内容'
      });
    }

    // 在更新之前获取原始笔记信息（用于对比@用户变化）
    const [originalPostRows] = await pool.execute('SELECT status, content FROM posts WHERE id = ?', [postId.toString()]);
    const wasOriginallyDraft = originalPostRows.length > 0 && originalPostRows[0].status === 1;
    const originalContent = originalPostRows.length > 0 ? originalPostRows[0].content : '';

    // 更新笔记基本信息
    await pool.execute(
      'UPDATE posts SET title = ?, content = ?, cover_url = ?, category_id = ?, status = ? WHERE id = ?',
      [title || '', sanitizedContent, normalizedCoverUrl.value, category_id || null, (status !== undefined ? status : 0).toString(), postId.toString()]
    );

    // 文本社区模式下不再处理帖子媒体更新，历史媒体内容保持原样

    // 获取原有标签列表（在删除前）
    const [oldTagsResult] = await pool.execute(
      'SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?',
      [postId.toString()]
    );
    const oldTags = oldTagsResult.map(tag => tag.name);
    const oldTagIds = new Map(oldTagsResult.map(tag => [tag.name, tag.id]));

    // 新标签列表
    const newTags = tags || [];

    // 找出需要删除的标签（在旧标签中但不在新标签中）
    const tagsToRemove = oldTags.filter(tagName => !newTags.includes(tagName));

    // 找出需要新增的标签（在新标签中但不在旧标签中）
    const tagsToAdd = newTags.filter(tagName => !oldTags.includes(tagName));

    // 删除原有标签关联
    await pool.execute('DELETE FROM post_tags WHERE post_id = ?', [postId.toString()]);

    // 减少已删除标签的使用次数
    for (const tagName of tagsToRemove) {
      const tagId = oldTagIds.get(tagName);
      if (tagId) {
        await pool.execute('UPDATE tags SET use_count = GREATEST(use_count - 1, 0) WHERE id = ?', [tagId]);
      }
    }

    // 处理新标签
    if (newTags.length > 0) {
      for (const tagName of newTags) {
        // 检查标签是否存在，不存在则创建
        let [tagRows] = await pool.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
        let tagId;

        if (tagRows.length === 0) {
          const [tagResult] = await pool.execute('INSERT INTO tags (name) VALUES (?)', [tagName]);
          tagId = tagResult.insertId;
        } else {
          tagId = tagRows[0].id;
        }

        // 关联笔记和标签
        await pool.execute('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);

        // 只对新增的标签增加使用次数（不在旧标签列表中的）
        if (tagsToAdd.includes(tagName)) {
          await pool.execute('UPDATE tags SET use_count = use_count + 1 WHERE id = ?', [tagId]);
        }
      }
    }

    logger.info('Post updated', {
      userId,
      postId,
      status: status !== undefined ? status : 0,
      tagCount: Array.isArray(newTags) ? newTags.length : 0,
      hasCoverUrl: Boolean(normalizedCoverUrl.value)
    });

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '更新成功',
      data: { id: postId }
    });
  } catch (error) {
    logger.error('Update post failed', { error, postId: req.params.id, userId: req.user?.id || null });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 删除笔记
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // 检查笔记是否存在且属于当前用户
    const [postRows] = await pool.execute(
      'SELECT user_id FROM posts WHERE id = ?',
      [postId.toString()]
    );

    if (postRows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '笔记不存在' });
    }

    if (postRows[0].user_id !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ code: RESPONSE_CODES.FORBIDDEN, message: '无权限删除此笔记' });
    }

    // 获取笔记关联的标签，减少标签使用次数
    const [tagResult] = await pool.execute(
      'SELECT tag_id FROM post_tags WHERE post_id = ?',
      [postId.toString()]
    );

    // 减少标签使用次数
    for (const tag of tagResult) {
      await pool.execute('UPDATE tags SET use_count = GREATEST(use_count - 1, 0) WHERE id = ?', [tag.tag_id.toString()]);
    }

    // 获取笔记关联的视频文件，用于清理
    const [videoRows] = await pool.execute('SELECT video_url, cover_url FROM post_videos WHERE post_id = ?', [postId.toString()]);

    // 删除相关数据（由于外键约束，需要按顺序删除）
    await pool.execute('DELETE FROM post_images WHERE post_id = ?', [postId.toString()]);
    await pool.execute('DELETE FROM post_videos WHERE post_id = ?', [postId.toString()]);
    await pool.execute('DELETE FROM post_tags WHERE post_id = ?', [postId.toString()]);
    await pool.execute('DELETE FROM likes WHERE target_type = 1 AND target_id = ?', [postId.toString()]);
    await pool.execute('DELETE FROM collections WHERE post_id = ?', [postId.toString()]);
    await pool.execute('DELETE FROM comments WHERE post_id = ?', [postId.toString()]);
    await pool.execute('DELETE FROM notifications WHERE target_id = ?', [postId.toString()]);

    // 清理关联的视频文件
    if (videoRows.length > 0) {
      const videoUrls = videoRows.map(row => row.video_url).filter(url => url);
      const coverUrls = videoRows.map(row => row.cover_url).filter(url => url);

      // 异步清理文件，不阻塞响应
      batchCleanupFiles(videoUrls, coverUrls).catch(error => {
        logger.error('Cleanup post media files failed', { error, postId });
      });
    }

    // 最后删除笔记
    await pool.execute('DELETE FROM posts WHERE id = ?', [postId.toString()]);

    logger.info('Post deleted', { userId, postId });

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '删除成功'
    });
  } catch (error) {
    logger.error('Delete post failed', { error, postId: req.params.id, userId: req.user?.id || null });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 取消收藏笔记
router.delete('/:id/collect', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // 删除收藏记录
    const [result] = await pool.execute(
      'DELETE FROM collections WHERE user_id = ? AND post_id = ?',
      [userId.toString(), postId.toString()]
    );

    if (result.affectedRows === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '收藏记录不存在' });
    }

    // 更新笔记收藏数
    await pool.execute('UPDATE posts SET collect_count = collect_count - 1 WHERE id = ?', [postId.toString()]);

    logger.info('Post collection removed via legacy endpoint', { userId, postId });
    res.json({ code: RESPONSE_CODES.SUCCESS, message: '取消收藏成功', data: { collected: false } });
  } catch (error) {
    logger.error('Delete post collection failed', { error, postId: req.params.id, userId: req.user?.id || null });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;
