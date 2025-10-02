const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Import middleware
const {
  authenticateToken,
  requireNewsEditor,
  requireAdmin,
} = require('../middleware/auth');

// Import models
const NewsArticle = require('../models/NewsArticleModel');
const NewsCategory = require('../models/NewsCategoryModel');

// Import utilities
const logger = require('../utils/logger');

// Error handling utility
const handleError = (error, res, operation = 'operation') => {
  logger.error(`${operation} error:`, error);

  // Handle validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map(
      (err) => err.message
    );
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors,
    });
  }

  // Handle duplicate key errors
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists',
    });
  }

  // Handle ObjectId errors
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // Handle other errors
  res.status(500).json({
    success: false,
    message: `Failed to ${operation}`,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

// Public routes
/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: Get published news articles
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter featured articles only
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for article title or description
 *     responses:
 *       200:
 *         description: Articles retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const featured = req.query.featured;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build query
    const query = { status: 'published' };

    // Category filter with ObjectId validation
    if (category) {
      // Validate if category is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format',
        });
      }
      query.categoryId = new mongoose.Types.ObjectId(category);
    }

    if (featured === 'true') query.isFeatured = true;

    // Add search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Get articles
    const articles = await NewsArticle.find(query)
      .populate('categoryId', 'name slug')
      .populate('authorId', 'fullName')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await NewsArticle.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        articles: articles.map((article) => ({
          _id: article._id,
          title: article.title,
          slug: article.slug,
          description: article.description,
          content: article.content,
          categoryId: article.categoryId,
          category: article.categoryId,
          minToRead: article.minToRead,
          postLink: article.postLink,
          featuredImage: article.featuredImage,
          isFeatured: article.isFeatured,
          viewCount: article.viewCount,
          author: article.authorId,
          publishedAt: article.publishedAt,
          createdAt: article.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get articles',
    });
  }
});

/**
 * @swagger
 * /api/news/categories:
 *   get:
 *     summary: Get all news categories
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for category name
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build query
    const query = { isActive: true };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Get total count
    const total = await NewsCategory.countDocuments(query);

    // Get categories with pagination
    const categories = await NewsCategory.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        categories: categories.map((category) => ({
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          isActive: category.isActive,
          createdAt: category.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
    });
  }
});

/**
 * @swagger
 * /api/news/suspended:
 *   get:
 *     summary: Get suspended articles (News Editor + Admin)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for article title
 *     responses:
 *       200:
 *         description: Suspended articles retrieved successfully
 */
router.get(
  '/suspended',
  authenticateToken,
  requireNewsEditor,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const skip = (page - 1) * limit;

      const query = {
        authorId: req.user._id,
        status: 'suspended',
      };

      // If admin, show all suspended articles
      if (req.user.role === 'admin') {
        delete query.authorId;
      }

      // Add search filter
      if (search) {
        query.title = { $regex: search, $options: 'i' };
      }

      const articles = await NewsArticle.find(query)
        .populate('categoryId', 'name slug')
        .populate('authorId', 'fullName')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await NewsArticle.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          articles: articles.map((article) => ({
            _id: article._id,
            title: article.title,
            slug: article.slug,
            description: article.description,
            content: article.content,
            categoryId: article.categoryId,
            category: article.categoryId,
            minToRead: article.minToRead,
            postLink: article.postLink,
            featuredImage: article.featuredImage,
            isFeatured: article.isFeatured,
            status: article.status,
            author: article.authorId,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Get suspended articles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get suspended articles',
      });
    }
  }
);

/**
 * @swagger
 * /api/news/admin/all:
 *   get:
 *     summary: Get all news articles including suspended ones (Admin only)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [published, suspended, archived]
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for article title or description
 *     responses:
 *       200:
 *         description: All articles retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const category = req.query.category;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build query - admin can see all articles
    const query = {};

    // Status filter
    if (status && ['published', 'suspended', 'archived'].includes(status)) {
      query.status = status;
    }

    // Category filter with ObjectId validation
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format',
        });
      }
      query.categoryId = new mongoose.Types.ObjectId(category);
    }

    // Add search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Get articles
    const articles = await NewsArticle.find(query)
      .populate('categoryId', 'name slug')
      .populate('authorId', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await NewsArticle.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        articles: articles.map((article) => ({
          _id: article._id,
          title: article.title,
          slug: article.slug,
          description: article.description,
          content: article.content,
          categoryId: article.categoryId,
          category: article.categoryId,
          minToRead: article.minToRead,
          postLink: article.postLink,
          featuredImage: article.featuredImage,
          isFeatured: article.isFeatured,
          status: article.status,
          viewCount: article.viewCount,
          author: article.authorId,
          publishedAt: article.publishedAt,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    handleError(error, res, 'Get all articles');
  }
});

/**
 * @swagger
 * /api/news/{id}:
 *   get:
 *     summary: Get published article by ID (Public)
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article retrieved successfully
 *       404:
 *         description: Article not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const article = await NewsArticle.findById(id)
      .populate('categoryId', 'name slug')
      .populate('authorId', 'fullName');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Only show published articles to public users
    if (article.status !== 'published') {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Increment view count for public access
    article.viewCount = (article.viewCount || 0) + 1;
    await article.save();

    res.json({
      success: true,
      data: {
        article: {
          _id: article._id,
          title: article.title,
          slug: article.slug,
          description: article.description,
          content: article.content,
          categoryId: article.categoryId,
          category: article.categoryId,
          minToRead: article.minToRead,
          postLink: article.postLink,
          featuredImage: article.featuredImage,
          isFeatured: article.isFeatured,
          status: article.status,
          viewCount: article.viewCount,
          author: article.authorId,
          publishedAt: article.publishedAt,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
        },
      },
    });
  } catch (error) {
    handleError(error, res, 'Get article by ID');
  }
});

/**
 * @swagger
 * /api/news/:slug:
 *   get:
 *     summary: Get article by slug
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article retrieved successfully
 *       404:
 *         description: Article not found
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await NewsArticle.findBySlug(slug)
      .populate('categoryId', 'name slug')
      .populate('authorId', 'fullName');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Increment view count
    article.viewCount = (article.viewCount || 0) + 1;
    await article.save();

    res.json({
      success: true,
      data: {
        article: {
          _id: article._id,
          title: article.title,
          description: article.description,
          content: article.content,
          categoryId: article.categoryId,
          category: article.categoryId,
          minToRead: article.minToRead,
          postLink: article.postLink,
          featuredImage: article.featuredImage,
          isFeatured: article.isFeatured,
          viewCount: article.viewCount,
          author: article.authorId,
          publishedAt: article.publishedAt,
          createdAt: article.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get article',
    });
  }
});

// Protected routes - News Management
/**
 * @swagger
 * /api/news:
 *   post:
 *     summary: Create new article (News Editor + Admin)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - content
 *               - categoryId
 *             properties:
 *               title:
 *                 type: string
 *                 description: Article title (min 5 characters)
 *               description:
 *                 type: string
 *                 description: Article description
 *               content:
 *                 type: string
 *                 description: Article content (min 50 characters)
 *               categoryId:
 *                 type: string
 *                 description: Category ID
 *               minToRead:
 *                 type: number
 *                 description: Minutes to read (1-60)
 *               postLink:
 *                 type: string
 *                 description: External post link
 *               featuredImage:
 *                 type: string
 *                 description: Featured image URL from file upload
 *               isFeatured:
 *                 type: boolean
 *                 description: Whether article is featured
 *     responses:
 *       201:
 *         description: Article created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/', authenticateToken, requireNewsEditor, async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      categoryId,
      minToRead,
      postLink,
      featuredImage,
      isFeatured,
    } = req.body;

    // Validate required fields
    if (!title || !description || !content || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, content, and categoryId are required',
      });
    }

    // Check if category exists
    const NewsCategory = require('../models/NewsCategoryModel');
    const category = await NewsCategory.findById(categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Generate slug from title
    const slug = NewsArticle.generateSlug(title);

    // Check if slug already exists
    const existingArticle = await NewsArticle.findOne({ slug });
    if (existingArticle) {
      return res.status(409).json({
        success: false,
        message: 'An article with this title already exists',
      });
    }

    // Create article
    const article = new NewsArticle({
      title,
      slug,
      description,
      content,
      categoryId,
      minToRead: minToRead || 3,
      postLink,
      featuredImage,
      isFeatured: isFeatured || false,
      authorId: req.user._id,
      status: 'published',
      publishedAt: new Date(),
    });

    await article.save();

    // Populate author and category
    await article.populate('authorId', 'fullName');
    await article.populate('categoryId', 'name slug');

    logger.info(`Article created: ${article.title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: {
        article: {
          _id: article._id,
          title: article.title,
          slug: article.slug,
          description: article.description,
          content: article.content,
          categoryId: article.categoryId,
          category: article.categoryId,
          minToRead: article.minToRead,
          postLink: article.postLink,
          featuredImage: article.featuredImage,
          isFeatured: article.isFeatured,
          status: article.status,
          author: article.authorId,
          createdAt: article.createdAt,
        },
      },
    });
  } catch (error) {
    handleError(error, res, 'create article');
  }
});

/**
 * @swagger
 * /api/news/{id}/manage:
 *   get:
 *     summary: Get article by ID for management (Admin/Editor only)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article retrieved successfully
 *       404:
 *         description: Article not found
 */
router.get(
  '/:id/manage',
  authenticateToken,
  requireNewsEditor,
  async (req, res) => {
    try {
      const { id } = req.params;

      const article = await NewsArticle.findById(id)
        .populate('categoryId', 'name slug')
        .populate('authorId', 'fullName');

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found',
        });
      }

      // Check if user can view this article
      if (
        article.authorId._id.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin'
      ) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own articles',
        });
      }

      res.json({
        success: true,
        data: {
          article: {
            _id: article._id,
            title: article.title,
            slug: article.slug,
            description: article.description,
            content: article.content,
            categoryId: article.categoryId,
            category: article.categoryId,
            minToRead: article.minToRead,
            postLink: article.postLink,
            featuredImage: article.featuredImage,
            isFeatured: article.isFeatured,
            status: article.status,
            viewCount: article.viewCount,
            author: article.authorId,
            publishedAt: article.publishedAt,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Get article by ID for management error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get article',
      });
    }
  }
);

/**
 * @swagger
 * /api/news/admin/{id}:
 *   get:
 *     summary: Get article by ID (Admin only - can see all statuses)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Article not found
 */
router.get('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const article = await NewsArticle.findById(id)
      .populate('categoryId', 'name slug')
      .populate('authorId', 'fullName');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Admin can see articles regardless of status
    // No view count increment for admin access

    res.json({
      success: true,
      data: {
        article: {
          _id: article._id,
          title: article.title,
          slug: article.slug,
          description: article.description,
          content: article.content,
          categoryId: article.categoryId,
          category: article.categoryId,
          minToRead: article.minToRead,
          postLink: article.postLink,
          featuredImage: article.featuredImage,
          isFeatured: article.isFeatured,
          status: article.status,
          viewCount: article.viewCount,
          author: article.authorId,
          publishedAt: article.publishedAt,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
        },
      },
    });
  } catch (error) {
    handleError(error, res, 'Get article by ID (Admin)');
  }
});

/**
 * @swagger
 * /api/news/{id}:
 *   put:
 *     summary: Update article (News Editor + Admin)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Article title
 *               description:
 *                 type: string
 *                 description: Article description
 *               content:
 *                 type: string
 *                 description: Article content
 *               categoryId:
 *                 type: string
 *                 description: Category ID
 *               minToRead:
 *                 type: number
 *                 description: Minutes to read
 *               postLink:
 *                 type: string
 *                 description: External post link
 *               featuredImage:
 *                 type: string
 *                 description: Featured image URL from file upload
 *               isFeatured:
 *                 type: boolean
 *                 description: Whether article is featured
 *     responses:
 *       200:
 *         description: Article updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Article not found
 */
router.put('/:id', authenticateToken, requireNewsEditor, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      content,
      categoryId,
      minToRead,
      postLink,
      featuredImage,
      isFeatured,
    } = req.body;

    const article = await NewsArticle.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }

    // Check if user can edit this article
    if (
      article.authorId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own articles',
      });
    }

    // Update fields
    if (title) {
      article.title = title;
      // Update slug if title changed
      article.slug = NewsArticle.generateSlug(title);
    }
    if (description !== undefined) article.description = description;
    if (content !== undefined) article.content = content;
    if (categoryId !== undefined) article.categoryId = categoryId;
    if (minToRead !== undefined) article.minToRead = minToRead;
    if (postLink !== undefined) article.postLink = postLink;
    if (featuredImage !== undefined && !req.file)
      article.featuredImage = featuredImage;
    if (isFeatured !== undefined) article.isFeatured = isFeatured;

    await article.save();

    // Populate author and category
    await article.populate('authorId', 'fullName');
    if (article.categoryId) {
      await article.populate('categoryId', 'name slug');
    }

    logger.info(`Article updated: ${article.title} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Article updated successfully',
      data: {
        article: {
          _id: article._id,
          title: article.title,
          slug: article.slug,
          description: article.description,
          content: article.content,
          categoryId: article.categoryId,
          category: article.categoryId,
          minToRead: article.minToRead,
          postLink: article.postLink,
          featuredImage: article.featuredImage,
          isFeatured: article.isFeatured,
          status: article.status,
          author: article.authorId,
          updatedAt: article.updatedAt,
        },
      },
    });
  } catch (error) {
    handleError(error, res, 'update article');
  }
});

/**
 * @swagger
 * /api/news/{id}:
 *   delete:
 *     summary: Delete article (News Editor + Admin)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article deleted successfully
 *       404:
 *         description: Article not found
 */
router.delete(
  '/:id',
  authenticateToken,
  requireNewsEditor,
  async (req, res) => {
    try {
      const { id } = req.params;

      const article = await NewsArticle.findById(id);
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found',
        });
      }

      // Check if user can delete this article
      if (
        article.authorId.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin'
      ) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own articles',
        });
      }

      await NewsArticle.findByIdAndDelete(id);

      logger.info(`Article deleted: ${article.title} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Article deleted successfully',
      });
    } catch (error) {
      handleError(error, res, 'delete article');
    }
  }
);

/**
 * @swagger
 * /api/news/{id}/suspend:
 *   post:
 *     summary: Suspend article (News Editor + Admin)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article suspended successfully
 *       404:
 *         description: Article not found
 */
router.post(
  '/:id/suspend',
  authenticateToken,
  requireNewsEditor,
  async (req, res) => {
    try {
      const { id } = req.params;

      const article = await NewsArticle.findById(id);
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found',
        });
      }

      // Check if user can suspend this article
      if (
        article.authorId.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin'
      ) {
        return res.status(403).json({
          success: false,
          message: 'You can only suspend your own articles',
        });
      }

      article.status = 'suspended';
      await article.save();

      logger.info(`Article suspended: ${article.title} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Article suspended successfully',
        data: {
          article: {
            _id: article._id,
            title: article.title,
            slug: article.slug,
            status: article.status,
            updatedAt: article.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Suspend article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to suspend article',
      });
    }
  }
);

/**
 * @swagger
 * /api/news/{id}/activate:
 *   post:
 *     summary: Activate suspended article (News Editor + Admin)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article activated successfully
 *       404:
 *         description: Article not found
 */
router.post(
  '/:id/activate',
  authenticateToken,
  requireNewsEditor,
  async (req, res) => {
    try {
      const { id } = req.params;

      const article = await NewsArticle.findById(id);
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found',
        });
      }

      // Check if user can activate this article
      if (
        article.authorId.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin'
      ) {
        return res.status(403).json({
          success: false,
          message: 'You can only activate your own articles',
        });
      }

      article.status = 'published';
      if (!article.publishedAt) {
        article.publishedAt = new Date();
      }
      await article.save();

      logger.info(`Article activated: ${article.title} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Article activated successfully',
        data: {
          article: {
            _id: article._id,
            title: article.title,
            slug: article.slug,
            status: article.status,
            publishedAt: article.publishedAt,
            updatedAt: article.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Activate article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate article',
      });
    }
  }
);

/**
 * @swagger
 * /api/news/categories:
 *   post:
 *     summary: Create new category (Admin only)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/categories',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required',
        });
      }

      // Create slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if category already exists
      const existingCategory = await NewsCategory.findOne({ slug });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'A category with this name already exists',
        });
      }

      // Create category
      const category = new NewsCategory({
        name,
        slug,
        description,
        isActive: true,
      });

      await category.save();

      logger.info(`Category created: ${category.name} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: {
          category: {
            _id: category._id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            isActive: category.isActive,
            createdAt: category.createdAt,
          },
        },
      });
    } catch (error) {
      logger.error('Create category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category',
      });
    }
  }
);

/**
 * @swagger
 * /api/news/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await NewsCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      data: {
        category: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          isActive: category.isActive,
          createdAt: category.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category',
    });
  }
});

/**
 * @swagger
 * /api/news/categories/{id}:
 *   put:
 *     summary: Update category (Admin only)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 */
router.put(
  '/categories/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      const category = await NewsCategory.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      // Update fields
      if (name) {
        category.name = name;
        // Update slug if name changed
        category.slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      if (description !== undefined) category.description = description;
      if (isActive !== undefined) category.isActive = isActive;

      await category.save();

      logger.info(`Category updated: ${category.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: {
          category: {
            _id: category._id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            isActive: category.isActive,
            updatedAt: category.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Update category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category',
      });
    }
  }
);

/**
 * @swagger
 * /api/news/categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       400:
 *         description: Cannot delete category with articles
 */
router.delete(
  '/categories/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const category = await NewsCategory.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      // Check if category has articles
      const articleCount = await NewsArticle.countDocuments({ categoryId: id });
      if (articleCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. It has ${articleCount} article(s).`,
        });
      }

      await NewsCategory.findByIdAndDelete(id);

      logger.info(`Category deleted: ${category.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      logger.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category',
      });
    }
  }
);

module.exports = router;
