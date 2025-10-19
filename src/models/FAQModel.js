const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      minlength: [10, 'Question must be at least 10 characters long'],
      maxlength: [500, 'Question cannot exceed 500 characters'],
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      minlength: [20, 'Answer must be at least 20 characters long'],
      maxlength: [2000, 'Answer cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['general', 'zakkat', 'waqf'],
        message: 'Category must be one of: general, zakkat, waqf',
      },
      default: 'general',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    orderIndex: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
faqSchema.index({ category: 1, isActive: 1 });
faqSchema.index({ orderIndex: 1 });

// Virtual for public data
faqSchema.virtual('publicData').get(function () {
  return {
    id: this._id,
    question: this.question,
    answer: this.answer,
    category: this.category,
    viewCount: this.viewCount,
    createdAt: this.createdAt,
  };
});

// Virtual for admin data
faqSchema.virtual('adminData').get(function () {
  return {
    id: this._id,
    question: this.question,
    answer: this.answer,
    category: this.category,
    isActive: this.isActive,
    orderIndex: this.orderIndex,
    viewCount: this.viewCount,
    createdBy: this.createdBy,
    updatedBy: this.updatedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

// Static methods
faqSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ orderIndex: 1, createdAt: -1 });
};

faqSchema.statics.findByCategory = function (category) {
  return this.find({ category, isActive: true }).sort({
    orderIndex: 1,
    createdAt: -1,
  });
};

faqSchema.statics.search = function (searchTerm, options = {}) {
  const { page = 1, limit = 10, category, adminView = false } = options;
  const skip = (page - 1) * limit;

  // Admin view shows all records, public view only shows active records
  let query = adminView ? {} : { isActive: true };

  if (searchTerm) {
    query.$or = [
      { question: { $regex: searchTerm, $options: 'i' } },
      { answer: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (category) {
    query.category = category;
  }

  return this.find(query)
    .sort({ orderIndex: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
};

// Instance methods
faqSchema.methods.incrementViewCount = async function () {
  this.viewCount += 1;
  return this.save();
};

faqSchema.methods.toggleActive = async function () {
  this.isActive = !this.isActive;
  return this.save();
};

// Pre-save middleware
faqSchema.pre('save', function (next) {
  if (
    this.isModified('question') ||
    this.isModified('answer') ||
    this.isModified('isActive')
  ) {
    this.updatedAt = new Date();
  }
  next();
});

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;
