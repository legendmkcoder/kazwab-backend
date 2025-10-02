const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
      minlength: [2, 'Position must be at least 2 characters long'],
      maxlength: [200, 'Position cannot exceed 200 characters'],
    },
    image: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters long'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: {
        values: ['board', 'management'],
        message: 'Type must be either "board" or "management"',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    orderIndex: {
      type: Number,
      default: 0,
    },
    socialLinks: {
      linkedin: {
        type: String,
        trim: true,
      },
      twitter: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
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
teamMemberSchema.index({ type: 1, isActive: 1 });
teamMemberSchema.index({ orderIndex: 1 });
teamMemberSchema.index({ name: 1 });

// Virtual for public data
teamMemberSchema.virtual('publicData').get(function () {
  return {
    id: this._id,
    name: this.name,
    position: this.position,
    image: this.image,
    description: this.description,
    type: this.type,
    socialLinks: this.socialLinks,
    createdAt: this.createdAt,
  };
});

// Virtual for admin data
teamMemberSchema.virtual('adminData').get(function () {
  return {
    id: this._id,
    name: this.name,
    position: this.position,
    image: this.image,
    description: this.description,
    type: this.type,
    isActive: this.isActive,
    orderIndex: this.orderIndex,
    socialLinks: this.socialLinks,
    createdBy: this.createdBy,
    updatedBy: this.updatedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

// Static methods
teamMemberSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ orderIndex: 1, createdAt: -1 });
};

teamMemberSchema.statics.findByType = function (type) {
  return this.find({ type, isActive: true }).sort({
    orderIndex: 1,
    createdAt: -1,
  });
};

teamMemberSchema.statics.findBoardMembers = function () {
  return this.find({ type: 'board', isActive: true }).sort({
    orderIndex: 1,
    createdAt: -1,
  });
};

teamMemberSchema.statics.findManagementTeam = function () {
  return this.find({ type: 'management', isActive: true }).sort({
    orderIndex: 1,
    createdAt: -1,
  });
};

teamMemberSchema.statics.search = function (searchTerm, options = {}) {
  const { page = 1, limit = 10, type } = options;
  const skip = (page - 1) * limit;

  let query = { isActive: true };

  if (searchTerm) {
    query.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { position: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ orderIndex: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
};

// Instance methods
teamMemberSchema.methods.toggleActive = async function () {
  this.isActive = !this.isActive;
  return this.save();
};

// Pre-save middleware
teamMemberSchema.pre('save', function (next) {
  if (
    this.isModified('name') ||
    this.isModified('position') ||
    this.isModified('description')
  ) {
    this.updatedAt = new Date();
  }
  next();
});

const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

module.exports = TeamMember;
