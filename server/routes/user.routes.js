const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

// Watchlist routes
router.get('/watchlist', userController.getWatchlist);
router.post('/watchlist/:contentId', userController.addToWatchlist);
router.delete('/watchlist/:contentId', userController.removeFromWatchlist);

// Watch history routes
router.get('/history', userController.getWatchHistory);
router.delete('/history', userController.clearWatchHistory);

// User profiles (multi-profile support)
router.get('/profiles', userController.getProfiles);
router.post('/profiles', userController.createProfile);
router.put('/profiles/:profileId', userController.updateProfile);
router.delete('/profiles/:profileId', userController.deleteProfile);

module.exports = router;
