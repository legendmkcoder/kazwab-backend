const mongoose = require('mongoose');

const successStorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [10, 'Title must be at least 10 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      minlength: [50, 'Content must be at least 50 characters long'],
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    beneficiaryName: {
      type: String,
      required: [true, 'Beneficiary name is required'],
      trim: true,
      minlength: [2, 'Beneficiary name must be at least 2 characters long'],
      maxlength: [100, 'Beneficiary name cannot exceed 100 characters'],
    },
    beneficiaryLocation: {
      type: String,
      required: [true, 'Beneficiary location is required'],
      trim: true,
      minlength: [2, 'Location must be at least 2 characters long'],
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    storyType: {
      type: String,
      required: [true, 'Story type is required'],
      enum: {
        values: [
          'technology',
          'healthcare',
          'education',
          'environment',
          'social',
          'economic',
        ],
        message:
          'Story type must be one of: technology, healthcare, education, environment, social, economic',
      },
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
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
    submittedBy: {
      type: String,
      trim: true,
    },
    submittedEmail: {
      type: String,
      trim: true,
      lowercase: true,
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
successStorySchema.index({ storyType: 1 });
successStorySchema.index({ createdAt: -1 });
successStorySchema.index({ featured: 1 });
successStorySchema.index({ rating: -1 });

// Virtual for public data (only verified stories)
successStorySchema.virtual('publicData').get(function () {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    beneficiaryName: this.beneficiaryName,
    beneficiaryLocation: this.beneficiaryLocation,
    storyType: this.storyType,
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
    title: this.title,
    content: this.content,
    beneficiaryName: this.beneficiaryName,
    beneficiaryLocation: this.beneficiaryLocation,
    storyType: this.storyType,
    imageUrl: this.imageUrl,
    rating: this.rating,
    isVerified: this.isVerified,
    isActive: this.isActive,
    featured: this.featured,
    viewCount: this.viewCount,
    submittedBy: this.submittedBy,
    submittedEmail: this.submittedEmail,
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
  return this.find({ isVerified: true, isActive: true }).sort({
    createdAt: -1,
  });
};

successStorySchema.statics.findPending = function () {
  return this.find({ isVerified: false, isActive: true }).sort({
    createdAt: -1,
  });
};

successStorySchema.statics.findByType = function (storyType) {
  return this.find({ storyType, isVerified: true, isActive: true }).sort({
    createdAt: -1,
  });
};

successStorySchema.statics.findFeatured = function () {
  return this.find({ featured: true, isVerified: true, isActive: true }).sort({
    createdAt: -1,
  });
};

successStorySchema.statics.search = function (searchTerm, options = {}) {
  const { page = 1, limit = 10, storyType, verified } = options;
  const skip = (page - 1) * limit;

  let query = { isActive: true };

  if (searchTerm) {
    query.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { beneficiaryName: { $regex: searchTerm, $options: 'i' } },
      { beneficiaryLocation: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (storyType) {
    query.storyType = storyType;
  }

  if (verified !== undefined) {
    query.isVerified = verified;
  }

  return this.find(query)
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
