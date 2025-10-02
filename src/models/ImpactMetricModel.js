const mongoose = require('mongoose');

const impactMetricSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: ['zakkat_collected', 'beneficiaries', 'transparency', 'projects'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    targetValue: {
      type: Number,
      min: 0,
    },
    targetDate: {
      type: Date,
    },
    previousValue: {
      type: Number,
      min: 0,
    },
    changePercentage: {
      type: Number,
    },
    icon: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
      default: '#3B82F6',
    },
    isPercentage: {
      type: Boolean,
      default: false,
    },
    isCurrency: {
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
impactMetricSchema.index({ category: 1 });
impactMetricSchema.index({ isActive: 1 });
impactMetricSchema.index({ displayOrder: 1 });
impactMetricSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate change percentage
impactMetricSchema.pre('save', function (next) {
  if (
    this.isModified('value') &&
    this.previousValue &&
    this.previousValue > 0
  ) {
    this.changePercentage =
      ((this.value - this.previousValue) / this.previousValue) * 100;
  }
  next();
});

// Instance method to get public data
impactMetricSchema.methods.getPublicData = function () {
  return {
    _id: this._id,
    title: this.title,
    value: this.value,
    unit: this.unit,
    description: this.description,
    category: this.category,
    displayOrder: this.displayOrder,
    targetValue: this.targetValue,
    targetDate: this.targetDate,
    changePercentage: this.changePercentage,
    icon: this.icon,
    color: this.color,
    isPercentage: this.isPercentage,
    isCurrency: this.isCurrency,
    currency: this.currency,
    createdAt: this.createdAt,
  };
};

// Instance method to get admin data (includes all fields)
impactMetricSchema.methods.getAdminData = function () {
  return {
    _id: this._id,
    title: this.title,
    value: this.value,
    unit: this.unit,
    description: this.description,
    category: this.category,
    isActive: this.isActive,
    displayOrder: this.displayOrder,
    targetValue: this.targetValue,
    targetDate: this.targetDate,
    previousValue: this.previousValue,
    changePercentage: this.changePercentage,
    icon: this.icon,
    color: this.color,
    isPercentage: this.isPercentage,
    isCurrency: this.isCurrency,
    currency: this.currency,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Instance method to update value
impactMetricSchema.methods.updateValue = function (newValue) {
  this.previousValue = this.value;
  this.value = newValue;
  return this.save();
};

// Instance method to format value for display
impactMetricSchema.methods.getFormattedValue = function () {
  if (this.isPercentage) {
    return `${this.value.toFixed(1)}%`;
  }

  if (this.isCurrency) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: this.currency,
    }).format(this.value);
  }

  if (this.unit) {
    return `${this.value.toLocaleString()} ${this.unit}`;
  }

  return this.value.toLocaleString();
};

// Static method to find active metrics
impactMetricSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ displayOrder: 1, title: 1 });
};

// Static method to find by category
impactMetricSchema.statics.findByCategory = function (category) {
  return this.find({ category, isActive: true }).sort({ displayOrder: 1 });
};

// Static method to get metrics by category
impactMetricSchema.statics.getMetricsByCategory = async function () {
  const metrics = await this.find({ isActive: true }).sort({ displayOrder: 1 });

  return metrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric.getPublicData());
    return acc;
  }, {});
};

// Static method to get metrics statistics
impactMetricSchema.statics.getStatistics = async function () {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ isActive: true });

  const byCategory = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
      },
    },
  ]);

  return {
    total,
    active,
    inactive: total - active,
    byCategory: byCategory.reduce((acc, cat) => {
      acc[cat._id] = {
        count: cat.count,
        totalValue: cat.totalValue,
      };
      return acc;
    }, {}),
  };
};

// Static method to reorder metrics
impactMetricSchema.statics.reorderMetrics = async function (newOrder) {
  const updates = newOrder.map((metricId, index) => ({
    updateOne: {
      filter: { _id: metricId },
      update: { displayOrder: index },
    },
  }));

  return this.bulkWrite(updates);
};

module.exports = mongoose.model('ImpactMetric', impactMetricSchema);
