const express = require('express');
const router = express.Router();
const contentController = require('../controllers/content.controller');
const { authenticate, adminOnly, optionalAuth } = require('../middleware/auth.middleware');
const { contentValidation, paginationValidation, mongoIdValidation } = require('../middleware/validation.middleware');

// Public routes
router.get('/', paginationValidation, contentController.getAllContent);
router.get('/featured', contentController.getFeaturedContent);
router.get('/trending', contentController.getTrendingContent);
router.get('/new-releases', contentController.getNewReleases);
router.get('/genres', contentController.getAllGenres);
router.get('/genre/:genre', paginationValidation, contentController.getContentByGenre);
router.get('/search', paginationValidation, contentController.searchContent);

// Single content - optional auth for resume point
router.get('/:id', optionalAuth, mongoIdValidation, contentController.getContentById);
router.get('/:id/seasons/:seasonNumber/episodes', contentController.getEpisodes);

// Admin routes
router.post('/', authenticate, adminOnly, contentValidation, contentController.createContent);
router.put('/:id', authenticate, adminOnly, mongoIdValidation, contentController.updateContent);
router.delete('/:id', authenticate, adminOnly, mongoIdValidation, contentController.deleteContent);

module.exports = router;
