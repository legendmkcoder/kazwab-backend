const mongoose = require('mongoose');
const crypto = require('crypto');

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
    unsubscribeToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    lastEmailSent: {
      type: Date,
    },
    emailCount: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ['website', 'api', 'import', 'other'],
      default: 'website',
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
  }
);

// Indexes
newsletterSubscriberSchema.index({ email: 1 });
newsletterSubscriberSchema.index({ isActive: 1 });
newsletterSubscriberSchema.index({ subscribedAt: -1 });
newsletterSubscriberSchema.index({ unsubscribeToken: 1 });

// Pre-save middleware to generate unsubscribe token
newsletterSubscriberSchema.pre('save', function (next) {
  if (this.isNew) {
    this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Instance method to get public data
newsletterSubscriberSchema.methods.getPublicData = function () {
  return {
    _id: this._id,
    email: this.email,
    isActive: this.isActive,
    subscribedAt: this.subscribedAt,
    source: this.source,
  };
};

// Instance method to unsubscribe
newsletterSubscriberSchema.methods.unsubscribe = function () {
  this.isActive = false;
  this.unsubscribedAt = new Date();
  return this.save();
};

// Instance method to resubscribe
newsletterSubscriberSchema.methods.resubscribe = function () {
  this.isActive = true;
  this.unsubscribedAt = null;
  this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
  return this.save();
};

// Instance method to update email sent info
newsletterSubscriberSchema.methods.updateEmailSent = function () {
  this.lastEmailSent = new Date();
  this.emailCount += 1;
  return this.save();
};

// Static method to find active subscribers
newsletterSubscriberSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ subscribedAt: -1 });
};

// Static method to find by email
newsletterSubscriberSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by unsubscribe token
newsletterSubscriberSchema.statics.findByUnsubscribeToken = function (token) {
  return this.findOne({ unsubscribeToken: token });
};

// Static method to get subscription statistics
newsletterSubscriberSchema.statics.getStatistics = async function () {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ isActive: true });
  const inactive = total - active;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySubscriptions = await this.countDocuments({
    subscribedAt: { $gte: today },
  });

  const todayUnsubscriptions = await this.countDocuments({
    unsubscribedAt: { $gte: today },
  });

  // Monthly growth
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const lastMonthSubscriptions = await this.countDocuments({
    subscribedAt: { $gte: lastMonth },
  });

  return {
    total,
    active,
    inactive,
    today: {
      subscriptions: todaySubscriptions,
      unsubscriptions: todayUnsubscriptions,
    },
    lastMonth: {
      subscriptions: lastMonthSubscriptions,
    },
  };
};

// Static method to bulk unsubscribe
newsletterSubscriberSchema.statics.bulkUnsubscribe = function (emails) {
  return this.updateMany(
    { email: { $in: emails } },
    {
      isActive: false,
      unsubscribedAt: new Date(),
    }
  );
};

// Static method to get subscribers for email campaign
newsletterSubscriberSchema.statics.getSubscribersForCampaign = function (
  limit = 1000
) {
  return this.find({
    isActive: true,
  })
    .sort({ lastEmailSent: 1, subscribedAt: -1 })
    .limit(limit)
    .select('email unsubscribeToken');
};

module.exports = mongoose.model(
  'NewsletterSubscriber',
  newsletterSubscriberSchema
);
