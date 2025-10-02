const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'],
    },
    subject: {
      type: String,
      enum: [
        'general_inquiry',
        'zakkat_payment',
        'waqf_establishment',
        'technical_support',
        'other',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved', 'closed'],
      default: 'new',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    response: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    respondedAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
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
contactSubmissionSchema.index({ email: 1 });
contactSubmissionSchema.index({ status: 1 });
contactSubmissionSchema.index({ subject: 1 });
contactSubmissionSchema.index({ assignedTo: 1 });
contactSubmissionSchema.index({ createdAt: -1 });
contactSubmissionSchema.index({ priority: 1 });

// Instance method to get public data
contactSubmissionSchema.methods.getPublicData = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    subject: this.subject,
    message: this.message,
    status: this.status,
    priority: this.priority,
    createdAt: this.createdAt,
  };
};

// Instance method to get admin data (includes all fields)
contactSubmissionSchema.methods.getAdminData = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    subject: this.subject,
    message: this.message,
    status: this.status,
    assignedTo: this.assignedTo,
    response: this.response,
    respondedAt: this.respondedAt,
    priority: this.priority,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Instance method to update status
contactSubmissionSchema.methods.updateStatus = function (
  status,
  userId = null
) {
  this.status = status;
  if (userId) {
    this.assignedTo = userId;
  }
  return this.save();
};

// Instance method to add response
contactSubmissionSchema.methods.addResponse = function (
  response,
  userId = null
) {
  this.response = response;
  this.respondedAt = new Date();
  if (userId) {
    this.assignedTo = userId;
  }
  if (this.status === 'new') {
    this.status = 'in_progress';
  }
  return this.save();
};

// Static method to find by status
contactSubmissionSchema.statics.findByStatus = function (status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to find by priority
contactSubmissionSchema.statics.findByPriority = function (priority) {
  return this.find({ priority }).sort({ createdAt: -1 });
};

// Static method to find unassigned submissions
contactSubmissionSchema.statics.findUnassigned = function () {
  return this.find({ assignedTo: { $exists: false } }).sort({ createdAt: -1 });
};

// Static method to get submission statistics
contactSubmissionSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const total = await this.countDocuments();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCount = await this.countDocuments({
    createdAt: { $gte: today },
  });

  return {
    total,
    today: todayCount,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
  };
};

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
