const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Import models
const User = require('../models/UserModel');
const NewsArticle = require('../models/NewsArticleModel');
const NewsCategory = require('../models/NewsCategoryModel');
const FAQ = require('../models/FAQModel');
const TeamMember = require('../models/TeamMemberModel');
const ContactSubmission = require('../models/ContactSubmissionModel');
const SuccessStory = require('../models/SuccessStoryModel');
const ImpactMetric = require('../models/ImpactMetricModel');
const NewsletterSubscriber = require('../models/NewsletterSubscriberModel');

// Import utilities
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get comprehensive dashboard statistics (Admin only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get current date for today's calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // User Statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
          },
        },
      },
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const todayUsers = await User.countDocuments({
      createdAt: { $gte: today },
    });

    // News Statistics
    const newsStats = await NewsArticle.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
        },
      },
    ]);

    const totalNews = await NewsArticle.countDocuments();
    const publishedNews = await NewsArticle.countDocuments({
      status: 'published',
    });
    const suspendedNews = await NewsArticle.countDocuments({
      status: 'suspended',
    });
    const featuredNews = await NewsArticle.countDocuments({ isFeatured: true });
    const todayNews = await NewsArticle.countDocuments({
      createdAt: { $gte: today },
    });
    const totalNewsViews = await NewsArticle.aggregate([
      { $group: { _id: null, total: { $sum: '$viewCount' } } },
    ]);

    // Category Statistics
    const categoryStats = await NewsCategory.aggregate([
      {
        $lookup: {
          from: 'newsarticles',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'articles',
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          articleCount: { $size: '$articles' },
        },
      },
      { $sort: { articleCount: -1 } },
    ]);

    // FAQ Statistics
    const faqStats = await FAQ.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          featured: { $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] } },
        },
      },
    ]);

    const totalFAQs = await FAQ.countDocuments();
    const activeFAQs = await FAQ.countDocuments({ isActive: true });
    const featuredFAQs = await FAQ.countDocuments({ isFeatured: true });
    const totalFAQViews = await FAQ.aggregate([
      { $group: { _id: null, total: { $sum: '$viewCount' } } },
    ]);

    // Team Member Statistics
    const teamStats = await TeamMember.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        },
      },
    ]);

    const totalTeamMembers = await TeamMember.countDocuments();
    const activeTeamMembers = await TeamMember.countDocuments({
      isActive: true,
    });

    // Contact Statistics
    const contactStats = await ContactSubmission.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalContacts = await ContactSubmission.countDocuments();
    const unreadContacts = await ContactSubmission.countDocuments({
      status: 'unread',
    });
    const todayContacts = await ContactSubmission.countDocuments({
      createdAt: { $gte: today },
    });

    // Success Story Statistics
    const successStoryStats = await SuccessStory.aggregate([
      {
        $group: {
          _id: '$storyType',
          count: { $sum: 1 },
          verified: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          featured: { $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] } },
        },
      },
    ]);

    const totalSuccessStories = await SuccessStory.countDocuments();
    const verifiedStories = await SuccessStory.countDocuments({
      isVerified: true,
    });
    const pendingStories = await SuccessStory.countDocuments({
      isVerified: false,
    });
    const featuredStories = await SuccessStory.countDocuments({
      isFeatured: true,
    });
    const todayStories = await SuccessStory.countDocuments({
      createdAt: { $gte: today },
    });

    // Impact Metrics Statistics
    const impactStats = await ImpactMetric.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          totalValue: { $sum: '$value' },
        },
      },
    ]);

    const totalMetrics = await ImpactMetric.countDocuments();
    const activeMetrics = await ImpactMetric.countDocuments({ isActive: true });

    // Newsletter Statistics
    const newsletterStats = await NewsletterSubscriber.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          todaySubscriptions: {
            $sum: { $cond: [{ $gte: ['$subscribedAt', today] }, 1, 0] },
          },
        },
      },
    ]);

    const totalSubscribers = newsletterStats[0]?.total || 0;
    const activeSubscribers = newsletterStats[0]?.active || 0;
    const todaySubscriptions = newsletterStats[0]?.todaySubscriptions || 0;

    // Compile dashboard data
    const dashboardData = {
      overview: {
        totalUsers,
        activeUsers,
        todayUsers,
        totalNews,
        publishedNews,
        totalFAQs,
        totalTeamMembers,
        totalContacts,
        totalSuccessStories,
        totalMetrics,
        totalSubscribers,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        today: todayUsers,
        byRole: userStats.reduce((acc, stat) => {
          acc[stat._id] = {
            total: stat.count,
            active: stat.active,
          };
          return acc;
        }, {}),
      },
      news: {
        total: totalNews,
        published: publishedNews,
        suspended: suspendedNews,
        featured: featuredNews,
        today: todayNews,
        totalViews: totalNewsViews[0]?.total || 0,
        byStatus: newsStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalViews: stat.totalViews,
          };
          return acc;
        }, {}),
        categories: categoryStats,
      },
      faqs: {
        total: totalFAQs,
        active: activeFAQs,
        featured: featuredFAQs,
        totalViews: totalFAQViews[0]?.total || 0,
        byCategory: faqStats.reduce((acc, stat) => {
          acc[stat._id] = {
            total: stat.count,
            active: stat.active,
            featured: stat.featured,
          };
          return acc;
        }, {}),
      },
      team: {
        total: totalTeamMembers,
        active: activeTeamMembers,
        byType: teamStats.reduce((acc, stat) => {
          acc[stat._id] = {
            total: stat.count,
            active: stat.active,
          };
          return acc;
        }, {}),
      },
      contacts: {
        total: totalContacts,
        unread: unreadContacts,
        today: todayContacts,
        byStatus: contactStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
      },
      successStories: {
        total: totalSuccessStories,
        verified: verifiedStories,
        pending: pendingStories,
        featured: featuredStories,
        today: todayStories,
        byType: successStoryStats.reduce((acc, stat) => {
          acc[stat._id] = {
            total: stat.count,
            verified: stat.verified,
            active: stat.active,
            featured: stat.featured,
          };
          return acc;
        }, {}),
      },
      impactMetrics: {
        total: totalMetrics,
        active: activeMetrics,
        byCategory: impactStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            active: stat.active,
            totalValue: stat.totalValue,
          };
          return acc;
        }, {}),
      },
      newsletter: {
        total: totalSubscribers,
        active: activeSubscribers,
        today: todaySubscriptions,
      },
      recentActivity: {
        lastUpdated: new Date().toISOString(),
      },
    };

    logger.info(`Dashboard stats retrieved by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: dashboardData,
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
