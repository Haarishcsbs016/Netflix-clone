const PlaybackSession = require('../models/PlaybackSession.model');
const User = require('../models/User.model');
const Content = require('../models/Content.model');

// @desc    Start playback session
// @route   POST /api/playback/start
// @access  Private
exports.startPlayback = async (req, res, next) => {
  try {
    const { contentId, episodeId, duration, quality } = req.body;

    // Verify content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Check subscription requirements
    const planHierarchy = ['free', 'basic', 'standard', 'premium'];
    const userPlan = req.user.subscription?.plan || 'free';
    const requiredPlan = content.subscriptionRequired || 'free';

    if (planHierarchy.indexOf(userPlan) < planHierarchy.indexOf(requiredPlan)) {
      return res.status(403).json({
        success: false,
        message: `This content requires a ${requiredPlan} subscription`
      });
    }

    // Find existing session or create new one
    let session = await PlaybackSession.findOne({
      userId: req.user._id,
      contentId,
      episodeId: episodeId || null,
      completed: false
    });

    if (!session) {
      session = await PlaybackSession.create({
        userId: req.user._id,
        contentId,
        episodeId,
        progress: {
          currentTime: 0,
          duration
        },
        quality: quality || 'auto',
        device: {
          type: req.headers['user-agent'],
          ip: req.ip
        }
      });
    }

    // Get video URL based on quality preference
    let videoUrl = content.videoUrl;
    if (content.type === 'series' && episodeId) {
      for (const season of content.seasons) {
        const episode = season.episodes.find(e => e._id.toString() === episodeId);
        if (episode) {
          videoUrl = episode.videoUrl;
          break;
        }
      }
    }

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        resumeFrom: session.progress.currentTime,
        videoUrl,
        subtitles: content.subtitles,
        quality: session.quality
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update playback progress
// @route   POST /api/playback/progress
// @access  Private
exports.updateProgress = async (req, res, next) => {
  try {
    const { sessionId, contentId, episodeId, currentTime, duration } = req.body;

    let session;

    if (sessionId) {
      session = await PlaybackSession.findById(sessionId);
    } else {
      session = await PlaybackSession.findOne({
        userId: req.user._id,
        contentId,
        episodeId: episodeId || null
      });
    }

    if (!session) {
      // Create new session if not found
      session = await PlaybackSession.create({
        userId: req.user._id,
        contentId,
        episodeId,
        progress: {
          currentTime,
          duration
        }
      });
    } else {
      // Update existing session
      session.progress.currentTime = currentTime;
      session.progress.duration = duration;
      session.sessionDuration += (currentTime - (session.progress.currentTime || 0));
      await session.save();
    }

    // Update watch history
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { watchHistory: { contentId } }
      }
    );

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          watchHistory: {
            $each: [{
              contentId,
              watchedAt: Date.now(),
              progress: session.progress.percentage,
              completed: session.completed
            }],
            $position: 0,
            $slice: 100 // Keep only last 100 items
          }
        }
      }
    );

    res.json({
      success: true,
      data: {
        progress: session.progress,
        completed: session.completed
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get resume point for content
// @route   GET /api/playback/resume/:contentId
// @access  Private
exports.getResumePoint = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const { episodeId } = req.query;

    const query = {
      userId: req.user._id,
      contentId,
      completed: false
    };

    if (episodeId) {
      query.episodeId = episodeId;
    }

    const session = await PlaybackSession.findOne(query)
      .sort({ lastUpdated: -1 });

    if (!session) {
      return res.json({
        success: true,
        data: {
          hasResumePoint: false,
          currentTime: 0
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasResumePoint: true,
        currentTime: session.progress.currentTime,
        percentage: session.progress.percentage,
        sessionId: session._id,
        episodeId: session.episodeId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get continue watching list
// @route   GET /api/playback/continue-watching
// @access  Private
exports.getContinueWatching = async (req, res, next) => {
  try {
    const sessions = await PlaybackSession.find({
      userId: req.user._id,
      completed: false,
      'progress.percentage': { $gt: 5, $lt: 90 }
    })
      .populate('contentId', 'title thumbnail type genres rating duration')
      .sort({ lastUpdated: -1 })
      .limit(20);

    const continueWatching = sessions.map(session => ({
      content: session.contentId,
      progress: session.progress,
      episodeId: session.episodeId,
      lastWatched: session.lastUpdated
    }));

    res.json({
      success: true,
      data: continueWatching
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark content as completed
// @route   POST /api/playback/complete
// @access  Private
exports.markCompleted = async (req, res, next) => {
  try {
    const { contentId, episodeId } = req.body;

    await PlaybackSession.findOneAndUpdate(
      {
        userId: req.user._id,
        contentId,
        episodeId: episodeId || null
      },
      {
        completed: true,
        'progress.percentage': 100
      }
    );

    // Update watch history
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'watchHistory.$[elem].completed': true,
          'watchHistory.$[elem].progress': 100
        }
      },
      {
        arrayFilters: [{ 'elem.contentId': contentId }]
      }
    );

    res.json({
      success: true,
      message: 'Marked as completed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get playback quality options
// @route   GET /api/playback/quality/:contentId
// @access  Private
exports.getQualityOptions = async (req, res, next) => {
  try {
    const { contentId } = req.params;

    const content = await Content.findById(contentId).select('videoQuality');

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Filter quality options based on subscription
    const planQualityMap = {
      free: ['360p', '480p'],
      basic: ['360p', '480p', '720p'],
      standard: ['360p', '480p', '720p', '1080p'],
      premium: ['360p', '480p', '720p', '1080p', '4K']
    };

    const userPlan = req.user.subscription?.plan || 'free';
    const allowedQualities = planQualityMap[userPlan];

    const availableQualities = content.videoQuality.filter(
      q => allowedQualities.includes(q.quality)
    );

    res.json({
      success: true,
      data: availableQualities
    });
  } catch (error) {
    next(error);
  }
};
