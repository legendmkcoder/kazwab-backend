const mongoose = require('mongoose');

const newsArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
      minlength: 50,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsCategory',
      required: true,
    },
    minToRead: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
      default: 3,
    },
    postLink: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    featuredImage: {
      type: String,
      trim: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['published', 'suspended', 'archived'],
      default: 'published',
    },
    publishedAt: {
      type: Date,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
newsArticleSchema.index({ categoryId: 1 });
newsArticleSchema.index({ status: 1 });
newsArticleSchema.index({ authorId: 1 });
newsArticleSchema.index({ publishedAt: -1 });
newsArticleSchema.index({ isFeatured: 1 });
newsArticleSchema.index({ viewCount: -1 });
newsArticleSchema.index({ minToRead: 1 });

// Instance method to increment view count
newsArticleSchema.methods.incrementViewCount = function () {
  this.viewCount = (this.viewCount || 0) + 1;
  return this.save();
};

// Static method to generate slug from title
newsArticleSchema.statics.generateSlug = function (title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Static method to find by slug
newsArticleSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, status: 'published' });
};

module.exports = mongoose.model('NewsArticle', newsArticleSchema);
