const { validationResult, body, param, query } = require('express-validator');

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Auth validations
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .trim()
    .withMessage('Username must be between 3 and 30 characters'),
  validate
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

// Content validations
const contentValidation = [
  body('title')
    .notEmpty()
    .trim()
    .withMessage('Title is required'),
  body('description')
    .notEmpty()
    .withMessage('Description is required'),
  body('type')
    .isIn(['movie', 'series'])
    .withMessage('Type must be either movie or series'),
  body('thumbnail')
    .notEmpty()
    .withMessage('Thumbnail is required'),
  validate
];

// Playback validations
const playbackProgressValidation = [
  body('contentId')
    .isMongoId()
    .withMessage('Valid content ID is required'),
  body('currentTime')
    .isNumeric()
    .withMessage('Current time must be a number'),
  body('duration')
    .isNumeric()
    .withMessage('Duration must be a number'),
  validate
];

// Query validations
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  validate
];

// ID param validation
const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  contentValidation,
  playbackProgressValidation,
  paginationValidation,
  mongoIdValidation
};
