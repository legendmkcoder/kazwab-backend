const mongoose = require('mongoose');

const newsCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
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
      trim: true,
      maxlength: 200,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
newsCategorySchema.index({ slug: 1 });
newsCategorySchema.index({ isActive: 1 });
newsCategorySchema.index({ createdAt: -1 });

// Static method to find active categories
newsCategorySchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find by slug
newsCategorySchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, isActive: true });
};

module.exports = mongoose.model('NewsCategory', newsCategorySchema);
