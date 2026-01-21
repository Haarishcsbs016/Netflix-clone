const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendation.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

// Public routes
router.get('/similar/:contentId', recommendationController.getSimilarContent);
router.get('/genre/:genre', recommendationController.getByGenre);
router.get('/trending/:genre', recommendationController.getTrendingInGenre);

// Protected routes
router.get('/personalized', authenticate, recommendationController.getPersonalizedRecommendations);
router.get('/because-watched/:contentId', authenticate, recommendationController.getBecauseYouWatched);
router.get('/top-picks', authenticate, recommendationController.getTopPicks);

module.exports = router;
