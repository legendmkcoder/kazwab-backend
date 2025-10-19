const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Make optional to support guest payments
    },
    txRef: {
      type: String,
      required: [true, 'Transaction reference is required'],
      unique: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN', 'USD', 'EUR'],
    },
    status: {
      type: String,
      required: [true, 'Payment status is required'],
      enum: ['pending', 'successful', 'failed', 'cancelled'],
      default: 'pending',
    },
    paymentType: {
      type: String,
      default: 'card',
    },
    chargedAmount: {
      type: Number,
      default: 0,
    },
    reference: {
      type: String,
      required: [true, 'Payment reference is required'],
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    flutterwaveResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    paymentMethod: {
      type: String,
      default: 'card',
    },
    paidAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
paymentSchema.index({ userId: 1 });
paymentSchema.index({ txRef: 1 });
paymentSchema.index({ reference: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ customerEmail: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for payment summary
paymentSchema.virtual('paymentSummary').get(function () {
  return {
    id: this._id,
    amount: this.amount,
    status: this.status,
    customerEmail: this.customerEmail,
    customerName: this.customerName,
    createdAt: this.createdAt,
    paidAt: this.paidAt,
  };
});

// Instance method to mark payment as successful
paymentSchema.methods.markAsSuccessful = function (verificationData) {
  this.status = 'successful';
  this.paidAt = new Date();
  this.flutterwaveResponse = verificationData;
  if (verificationData.charged_amount) {
    this.chargedAmount = verificationData.charged_amount;
  }
  if (verificationData.payment_type) {
    this.paymentType = verificationData.payment_type;
  }
  return this.save();
};

// Instance method to mark payment as failed
paymentSchema.methods.markAsFailed = function (errorData) {
  this.status = 'failed';
  this.flutterwaveResponse = errorData;
  return this.save();
};

// Static method to find payments by user
paymentSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to find successful payments
paymentSchema.statics.findSuccessful = function () {
  return this.find({ status: 'successful' }).sort({ paidAt: -1 });
};

// Static method to get payment statistics
paymentSchema.statics.getStatistics = async function () {
  const total = await this.countDocuments();
  const successful = await this.countDocuments({ status: 'successful' });
  const pending = await this.countDocuments({ status: 'pending' });
  const failed = await this.countDocuments({ status: 'failed' });

  const totalAmount = await this.aggregate([
    { $match: { status: 'successful' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPayments = await this.countDocuments({
    createdAt: { $gte: today },
    status: 'successful',
  });

  return {
    total,
    successful,
    pending,
    failed,
    totalAmount: totalAmount[0]?.total || 0,
    todayPayments,
  };
};

module.exports = mongoose.model('Payment', paymentSchema);
