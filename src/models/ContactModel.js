const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters long'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [5, 'Subject must be at least 5 characters long'],
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters long'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['unread', 'read', 'replied', 'archived'],
        message: 'Status must be one of: unread, read, replied, archived',
      },
      default: 'unread',
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
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ fullName: 1 });

// Virtual for admin data
contactSchema.virtual('adminData').get(function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phoneNumber: this.phoneNumber,
    subject: this.subject,
    message: this.message,
    status: this.status,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

// Static methods
contactSchema.statics.findByStatus = function (status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

contactSchema.statics.findUnread = function () {
  return this.find({ status: 'unread' }).sort({ createdAt: -1 });
};

contactSchema.statics.search = function (searchTerm, options = {}) {
  const { page = 1, limit = 10, status } = options;
  const skip = (page - 1) * limit;

  let query = {};

  if (searchTerm) {
    query.$or = [
      { fullName: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { subject: { $regex: searchTerm, $options: 'i' } },
      { message: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
};

// Instance methods
contactSchema.methods.markAsRead = async function () {
  this.status = 'read';
  return this.save();
};

contactSchema.methods.markAsReplied = async function () {
  this.status = 'replied';
  return this.save();
};

contactSchema.methods.archive = async function () {
  this.status = 'archived';
  return this.save();
};

// Pre-save middleware
contactSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.updatedAt = new Date();
  }
  next();
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
