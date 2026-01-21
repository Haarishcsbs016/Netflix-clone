const Content = require('../models/Content.model');
const User = require('../models/User.model');
const PlaybackSession = require('../models/PlaybackSession.model');

// @desc    Get personalized recommendations
// @route   GET /api/recommendations/personalized
// @access  Private
exports.getPersonalizedRecommendations = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user._id;

    // Get user's watch history and preferences
    const user = await User.findById(userId)
      .populate('watchHistory.contentId', 'genres type')
      .populate('watchlist', 'genres type');

    // Analyze user's genre preferences
    const genreScores = {};
    const typePreference = { movie: 0, series: 0 };

    // Score from watch history
    user.watchHistory.forEach((item, index) => {
      if (!item.contentId) return;
      
      const weight = Math.max(1, 10 - index * 0.5); // Recent watches weighted more
      
      item.contentId.genres.forEach(genre => {
        genreScores[genre] = (genreScores[genre] || 0) + weight;
      });
      
      typePreference[item.contentId.type] += weight;
    });

    // Score from watchlist
    user.watchlist.forEach(item => {
      if (!item) return;
      
      item.genres.forEach(genre => {
        genreScores[genre] = (genreScores[genre] || 0) + 2;
      });
      
      typePreference[item.type] += 2;
    });

    // Get top genres
    const topGenres = Object.entries(genreScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    // Get watched content IDs to exclude
    const watchedIds = user.watchHistory
      .filter(h => h.completed)
      .map(h => h.contentId?._id);

    // Build recommendation query
    let recommendations = [];

    if (topGenres.length > 0) {
      // Primary recommendations based on genres
      recommendations = await Content.find({
        genres: { $in: topGenres },
        _id: { $nin: watchedIds },
        status: 'published'
      })
        .select('title thumbnail type genres rating releaseYear views description')
        .sort({ views: -1, imdbRating: -1 })
        .limit(parseInt(limit));
    }

    // If not enough recommendations, fill with trending content
    if (recommendations.length < limit) {
      const additionalRecs = await Content.find({
        _id: { 
          $nin: [...watchedIds, ...recommendations.map(r => r._id)]
        },
        status: 'published'
      })
        .select('title thumbnail type genres rating releaseYear views description')
        .sort({ views: -1, createdAt: -1 })
        .limit(parseInt(limit) - recommendations.length);

      recommendations = [...recommendations, ...additionalRecs];
    }

    // Shuffle recommendations slightly for variety
    recommendations = recommendations.sort(() => Math.random() - 0.5);

    res.json({
      success: true,
      data: recommendations,
      meta: {
        basedOn: topGenres.slice(0, 3)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get similar content
// @route   GET /api/recommendations/similar/:contentId
// @access  Public
exports.getSimilarContent = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const { limit = 12 } = req.query;

    const content = await Content.findById(contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Find similar content based on genres and type
    const similar = await Content.find({
      _id: { $ne: contentId },
      type: content.type,
      genres: { $in: content.genres },
      status: 'published'
    })
      .select('title thumbnail type genres rating releaseYear views')
      .sort({ 
        imdbRating: -1,
        views: -1 
      })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: similar
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recommendations by genre
// @route   GET /api/recommendations/genre/:genre
// @access  Public
exports.getByGenre = async (req, res, next) => {
  try {
    const { genre } = req.params;
    const { limit = 20, excludeIds = [] } = req.query;

    const content = await Content.find({
      genres: { $regex: new RegExp(genre, 'i') },
      _id: { $nin: excludeIds },
      status: 'published'
    })
      .select('title thumbnail type genres rating releaseYear views')
      .sort({ views: -1, imdbRating: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get "Because you watched" recommendations
// @route   GET /api/recommendations/because-watched/:contentId
// @access  Private
exports.getBecauseYouWatched = async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const { limit = 10 } = req.query;

    const watchedContent = await Content.findById(contentId);

    if (!watchedContent) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Find content with same genres, director, or cast
    const similar = await Content.find({
      _id: { $ne: contentId },
      status: 'published',
      $or: [
        { genres: { $in: watchedContent.genres } },
        { director: watchedContent.director },
        { 'cast.name': { $in: watchedContent.cast.map(c => c.name).slice(0, 3) } }
      ]
    })
      .select('title thumbnail type genres rating releaseYear views')
      .sort({ imdbRating: -1, views: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        basedOn: {
          id: watchedContent._id,
          title: watchedContent.title
        },
        recommendations: similar
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top picks for user
// @route   GET /api/recommendations/top-picks
// @access  Private
exports.getTopPicks = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const user = await User.findById(req.user._id)
      .populate('watchHistory.contentId', 'genres');

    // Get user's preferred genres
    const genreCount = {};
    user.watchHistory.forEach(item => {
      if (!item.contentId) return;
      item.contentId.genres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    });

    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    // Get highly rated content in preferred genres
    const topPicks = await Content.find({
      genres: { $in: topGenres.length > 0 ? topGenres : ['Drama', 'Action', 'Comedy'] },
      status: 'published',
      imdbRating: { $gte: 7 }
    })
      .select('title thumbnail type genres rating releaseYear imdbRating views description')
      .sort({ imdbRating: -1, views: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: topPicks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending in genre
// @route   GET /api/recommendations/trending/:genre
// @access  Public
exports.getTrendingInGenre = async (req, res, next) => {
  try {
    const { genre } = req.params;
    const { limit = 10 } = req.query;

    const content = await Content.find({
      genres: { $regex: new RegExp(genre, 'i') },
      status: 'published'
    })
      .select('title thumbnail type genres rating releaseYear views')
      .sort({ views: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};
