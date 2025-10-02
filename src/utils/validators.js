const Joi = require('joi');

// User validation schemas
const userValidation = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required',
    }),
    fullName: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full name is required',
    }),
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
      }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  updateProfile: Joi.object({
    fullName: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name cannot exceed 100 characters',
    }),
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
      }),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: Joi.string().min(8).required().messages({
      'string.min': 'New password must be at least 8 characters long',
      'any.required': 'New password is required',
    }),
  }),
};

// News category validation schemas
const newsCategoryValidation = {
  create: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Category name must be at least 2 characters long',
      'string.max': 'Category name cannot exceed 50 characters',
      'any.required': 'Category name is required',
    }),
    description: Joi.string().max(200).optional().messages({
      'string.max': 'Description cannot exceed 200 characters',
    }),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(50).optional().messages({
      'string.min': 'Category name must be at least 2 characters long',
      'string.max': 'Category name cannot exceed 50 characters',
    }),
    description: Joi.string().max(200).optional().messages({
      'string.max': 'Description cannot exceed 200 characters',
    }),
    isActive: Joi.boolean().optional(),
  }),
};

// News article validation schemas
const newsArticleValidation = {
  create: Joi.object({
    title: Joi.string().min(5).max(200).required().messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required',
    }),
    excerpt: Joi.string().max(300).optional().messages({
      'string.max': 'Excerpt cannot exceed 300 characters',
    }),
    content: Joi.string().min(50).required().messages({
      'string.min': 'Content must be at least 50 characters long',
      'any.required': 'Content is required',
    }),
    categoryId: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Invalid category ID format',
      'string.length': 'Category ID must be 24 characters long',
      'any.required': 'Category is required',
    }),
    imageAlt: Joi.string().max(100).optional().messages({
      'string.max': 'Image alt text cannot exceed 100 characters',
    }),
    metaTitle: Joi.string().max(60).optional().messages({
      'string.max': 'Meta title cannot exceed 60 characters',
    }),
    metaDescription: Joi.string().max(160).optional().messages({
      'string.max': 'Meta description cannot exceed 160 characters',
    }),
    tags: Joi.array().items(Joi.string().max(30)).max(10).optional().messages({
      'array.max': 'Cannot have more than 10 tags',
      'string.max': 'Tag cannot exceed 30 characters',
    }),
    isFeatured: Joi.boolean().optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(200).optional().messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters',
    }),
    excerpt: Joi.string().max(300).optional().messages({
      'string.max': 'Excerpt cannot exceed 300 characters',
    }),
    content: Joi.string().min(50).optional().messages({
      'string.min': 'Content must be at least 50 characters long',
    }),
    categoryId: Joi.string().hex().length(24).optional().messages({
      'string.hex': 'Invalid category ID format',
      'string.length': 'Category ID must be 24 characters long',
    }),
    imageAlt: Joi.string().max(100).optional().messages({
      'string.max': 'Image alt text cannot exceed 100 characters',
    }),
    metaTitle: Joi.string().max(60).optional().messages({
      'string.max': 'Meta title cannot exceed 60 characters',
    }),
    metaDescription: Joi.string().max(160).optional().messages({
      'string.max': 'Meta description cannot exceed 160 characters',
    }),
    tags: Joi.array().items(Joi.string().max(30)).max(10).optional().messages({
      'array.max': 'Cannot have more than 10 tags',
      'string.max': 'Tag cannot exceed 30 characters',
    }),
    isFeatured: Joi.boolean().optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
  }),
};

// Contact submission validation schemas
const contactValidation = {
  submit: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
      }),
    subject: Joi.string()
      .valid(
        'general_inquiry',
        'zakkat_payment',
        'waqf_establishment',
        'technical_support',
        'other'
      )
      .required()
      .messages({
        'any.only': 'Please select a valid subject',
        'any.required': 'Subject is required',
      }),
    message: Joi.string().min(10).max(1000).required().messages({
      'string.min': 'Message must be at least 10 characters long',
      'string.max': 'Message cannot exceed 1000 characters',
      'any.required': 'Message is required',
    }),
  }),

  update: Joi.object({
    status: Joi.string()
      .valid('new', 'in_progress', 'resolved', 'closed')
      .optional(),
    response: Joi.string().max(1000).optional().messages({
      'string.max': 'Response cannot exceed 1000 characters',
    }),
    assignedTo: Joi.string().hex().length(24).optional().messages({
      'string.hex': 'Invalid user ID format',
      'string.length': 'User ID must be 24 characters long',
    }),
  }),
};

// Newsletter validation schemas
const newsletterValidation = {
  subscribe: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  }),

  unsubscribe: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  }),
};

// Team member validation schemas
const teamMemberValidation = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
    position: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Position must be at least 2 characters long',
      'string.max': 'Position cannot exceed 100 characters',
      'any.required': 'Position is required',
    }),
    description: Joi.string().max(500).optional().messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),
    memberType: Joi.string()
      .valid('board_director', 'management_team')
      .required()
      .messages({
        'any.only':
          'Member type must be either board_director or management_team',
        'any.required': 'Member type is required',
      }),
    orderIndex: Joi.number().integer().min(0).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
    }),
    position: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'Position must be at least 2 characters long',
      'string.max': 'Position cannot exceed 100 characters',
    }),
    description: Joi.string().max(500).optional().messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),
    memberType: Joi.string()
      .valid('board_director', 'management_team')
      .optional()
      .messages({
        'any.only':
          'Member type must be either board_director or management_team',
      }),
    orderIndex: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

// Impact metrics validation schemas
const impactMetricValidation = {
  create: Joi.object({
    title: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Title must be at least 2 characters long',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required',
    }),
    value: Joi.number().positive().required().messages({
      'number.positive': 'Value must be a positive number',
      'any.required': 'Value is required',
    }),
    unit: Joi.string().max(20).optional().messages({
      'string.max': 'Unit cannot exceed 20 characters',
    }),
    description: Joi.string().max(200).optional().messages({
      'string.max': 'Description cannot exceed 200 characters',
    }),
    category: Joi.string()
      .valid('zakkat_collected', 'beneficiaries', 'transparency', 'projects')
      .required()
      .messages({
        'any.only': 'Please select a valid category',
        'any.required': 'Category is required',
      }),
    displayOrder: Joi.number().integer().min(0).optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'Title must be at least 2 characters long',
      'string.max': 'Title cannot exceed 100 characters',
    }),
    value: Joi.number().positive().optional().messages({
      'number.positive': 'Value must be a positive number',
    }),
    unit: Joi.string().max(20).optional().messages({
      'string.max': 'Unit cannot exceed 20 characters',
    }),
    description: Joi.string().max(200).optional().messages({
      'string.max': 'Description cannot exceed 200 characters',
    }),
    category: Joi.string()
      .valid('zakkat_collected', 'beneficiaries', 'transparency', 'projects')
      .optional()
      .messages({
        'any.only': 'Please select a valid category',
      }),
    displayOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

// Success story validation schemas
const successStoryValidation = {
  create: Joi.object({
    title: Joi.string().min(5).max(200).required().messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required',
    }),
    content: Joi.string().min(50).required().messages({
      'string.min': 'Content must be at least 50 characters long',
      'any.required': 'Content is required',
    }),
    beneficiaryName: Joi.string().max(100).optional().messages({
      'string.max': 'Beneficiary name cannot exceed 100 characters',
    }),
    beneficiaryLocation: Joi.string().max(100).optional().messages({
      'string.max': 'Beneficiary location cannot exceed 100 characters',
    }),
    storyType: Joi.string()
      .valid('zakkat_beneficiary', 'waqf_beneficiary', 'community_project')
      .required()
      .messages({
        'any.only': 'Please select a valid story type',
        'any.required': 'Story type is required',
      }),
    rating: Joi.number().integer().min(1).max(5).optional().messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
    }),
    isVerified: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(200).optional().messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters',
    }),
    content: Joi.string().min(50).optional().messages({
      'string.min': 'Content must be at least 50 characters long',
    }),
    beneficiaryName: Joi.string().max(100).optional().messages({
      'string.max': 'Beneficiary name cannot exceed 100 characters',
    }),
    beneficiaryLocation: Joi.string().max(100).optional().messages({
      'string.max': 'Beneficiary location cannot exceed 100 characters',
    }),
    storyType: Joi.string()
      .valid('zakkat_beneficiary', 'waqf_beneficiary', 'community_project')
      .optional()
      .messages({
        'any.only': 'Please select a valid story type',
      }),
    rating: Joi.number().integer().min(1).max(5).optional().messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
    }),
    isVerified: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
  }),
};

// Query parameter validation schemas
const queryValidation = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),

  search: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    category: Joi.string().hex().length(24).optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
    featured: Joi.boolean().optional(),
  }),
};

module.exports = {
  userValidation,
  newsCategoryValidation,
  newsArticleValidation,
  contactValidation,
  newsletterValidation,
  teamMemberValidation,
  impactMetricValidation,
  successStoryValidation,
  queryValidation,
};
