const express = require('express');
const router = express.Router();
const playbackController = require('../controllers/playback.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { playbackProgressValidation } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(authenticate);

// Playback routes
router.post('/start', playbackController.startPlayback);
router.post('/progress', playbackController.updateProgress);
router.post('/complete', playbackController.markCompleted);
router.get('/resume/:contentId', playbackController.getResumePoint);
router.get('/continue-watching', playbackController.getContinueWatching);
router.get('/quality/:contentId', playbackController.getQualityOptions);

module.exports = router;
