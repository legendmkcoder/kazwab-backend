const mongoose = require('mongoose');

const successStorySchema = new mongoose.Schema(
  {
    // Your Name
    submittedBy: {
      type: String,
      required: [true, 'Your name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    // Location
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      minlength: [2, 'Location must be at least 2 characters long'],
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    // Category (from the category we created)
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsCategory',
      required: [true, 'Category is required'],
    },
    // Email
    submittedEmail: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    // Your Story
    content: {
      type: String,
      required: [true, 'Your story is required'],
      trim: true,
      minlength: [50, 'Story must be at least 50 characters long'],
      maxlength: [5000, 'Story cannot exceed 5000 characters'],
    },
    // Rating
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    // Optional image
    imageUrl: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
successStorySchema.index({ isVerified: 1, isActive: 1 });
successStorySchema.index({ categoryId: 1 });
successStorySchema.index({ createdAt: -1 });
successStorySchema.index({ featured: 1 });
successStorySchema.index({ rating: -1 });
successStorySchema.index({ submittedEmail: 1 });

// Virtual for public data (only verified stories)
successStorySchema.virtual('publicData').get(function () {
  return {
    id: this._id,
    submittedBy: this.submittedBy,
    location: this.location,
    category: this.categoryId, // This will be populated with full category info
    content: this.content,
    imageUrl: this.imageUrl,
    rating: this.rating,
    featured: this.featured,
    viewCount: this.viewCount,
    createdAt: this.createdAt,
  };
});

// Virtual for admin data (includes all fields)
successStorySchema.virtual('adminData').get(function () {
  return {
    id: this._id,
    submittedBy: this.submittedBy,
    location: this.location,
    category: this.categoryId, // This will be populated with full category info
    submittedEmail: this.submittedEmail,
    content: this.content,
    imageUrl: this.imageUrl,
    rating: this.rating,
    isVerified: this.isVerified,
    isActive: this.isActive,
    featured: this.featured,
    viewCount: this.viewCount,
    approvedBy: this.approvedBy,
    approvedAt: this.approvedAt,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

// Static methods
successStorySchema.statics.findVerified = function () {
  return this.find({ isVerified: true, isActive: true })
    .populate('categoryId', 'name slug description')
    .sort({ createdAt: -1 });
};

successStorySchema.statics.findPending = function () {
  return this.find({ isVerified: false, isActive: true })
    .populate('categoryId', 'name slug description')
    .sort({ createdAt: -1 });
};

successStorySchema.statics.findByCategory = function (categoryId) {
  return this.find({ categoryId, isVerified: true, isActive: true })
    .populate('categoryId', 'name slug description')
    .sort({ createdAt: -1 });
};

successStorySchema.statics.findFeatured = function () {
  return this.find({ featured: true, isVerified: true, isActive: true })
    .populate('categoryId', 'name slug description')
    .sort({ createdAt: -1 });
};

successStorySchema.statics.search = function (searchTerm, options = {}) {
  const {
    page = 1,
    limit = 10,
    categoryId,
    verified,
    isActive,
    adminView = false,
  } = options;
  const skip = (page - 1) * limit;

  // Admin view shows all records by default, public view only shows active records
  let query = adminView ? {} : { isActive: true };

  if (searchTerm) {
    query.$or = [
      { content: { $regex: searchTerm, $options: 'i' } },
      { submittedBy: { $regex: searchTerm, $options: 'i' } },
      { location: { $regex: searchTerm, $options: 'i' } },
      { submittedEmail: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (categoryId) {
    query.categoryId = categoryId;
  }

  if (verified !== undefined) {
    query.isVerified = verified;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  return this.find(query)
    .populate('categoryId', 'name slug description')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
};

// Instance methods
successStorySchema.methods.approve = async function (adminId) {
  this.isVerified = true;
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  return this.save();
};

successStorySchema.methods.reject = async function () {
  this.isActive = false;
  return this.save();
};

successStorySchema.methods.toggleFeatured = async function () {
  this.featured = !this.featured;
  return this.save();
};

successStorySchema.methods.toggleActive = async function () {
  this.isActive = !this.isActive;
  return this.save();
};

successStorySchema.methods.incrementViewCount = async function () {
  this.viewCount += 1;
  return this.save();
};

// Pre-save middleware
successStorySchema.pre('save', function (next) {
  if (
    this.isModified('isVerified') ||
    this.isModified('featured') ||
    this.isModified('isActive')
  ) {
    this.updatedAt = new Date();
  }
  next();
});

const SuccessStory = mongoose.model('SuccessStory', successStorySchema);

module.exports = SuccessStory;
