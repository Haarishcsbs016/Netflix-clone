const Content = require('../models/Content.model');
const PlaybackSession = require('../models/PlaybackSession.model');

// @desc    Get all content with filters
// @route   GET /api/content
// @access  Public
exports.getAllContent = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      genre,
      year,
      rating,
      language,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    const query = { status: 'published' };

    if (type) query.type = type;
    if (genre) query.genres = { $in: Array.isArray(genre) ? genre : [genre] };
    if (year) query.releaseYear = year;
    if (rating) query.rating = rating;
    if (language) query.language = language;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = order === 'asc' ? 1 : -1;

    const [content, total] = await Promise.all([
      Content.find(query)
        .select('-videoUrl -videoQuality -seasons.episodes.videoUrl')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),
      Content.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single content by ID
// @route   GET /api/content/:id
// @access  Public
exports.getContentById = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Increment views
    content.views += 1;
    await content.save();

    // Get resume point if user is authenticated
    let resumePoint = null;
    if (req.user) {
      const session = await PlaybackSession.findOne({
        userId: req.user._id,
        contentId: content._id,
        completed: false
      }).sort({ lastUpdated: -1 });

      if (session) {
        resumePoint = {
          currentTime: session.progress.currentTime,
          percentage: session.progress.percentage
        };
      }
    }

    res.json({
      success: true,
      data: {
        ...content.toObject(),
        resumePoint
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured content
// @route   GET /api/content/featured
// @access  Public
exports.getFeaturedContent = async (req, res, next) => {
  try {
    const content = await Content.find({ 
      featured: true, 
      status: 'published' 
    })
      .select('title description thumbnail bannerImage type genres rating trailerUrl')
      .limit(10)
      .sort({ views: -1 });

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending content
// @route   GET /api/content/trending
// @access  Public
exports.getTrendingContent = async (req, res, next) => {
  try {
    const { limit = 20, type } = req.query;

    const query = { status: 'published' };
    if (type) query.type = type;

    // Calculate trending based on recent views
    const content = await Content.find(query)
      .select('title thumbnail type genres rating views releaseYear')
      .sort({ views: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get new releases
// @route   GET /api/content/new-releases
// @access  Public
exports.getNewReleases = async (req, res, next) => {
  try {
    const { limit = 20, type } = req.query;

    const query = { status: 'published' };
    if (type) query.type = type;

    const content = await Content.find(query)
      .select('title thumbnail type genres rating releaseYear')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get content by genre
// @route   GET /api/content/genre/:genre
// @access  Public
exports.getContentByGenre = async (req, res, next) => {
  try {
    const { genre } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    const query = { 
      genres: { $regex: new RegExp(genre, 'i') },
      status: 'published'
    };
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [content, total] = await Promise.all([
      Content.find(query)
        .select('title thumbnail type genres rating releaseYear views')
        .sort({ views: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Content.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search content
// @route   GET /api/content/search
// @access  Public
exports.searchContent = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Text search
    const searchQuery = {
      $text: { $search: q },
      status: 'published'
    };

    const [content, total] = await Promise.all([
      Content.find(searchQuery)
        .select('title thumbnail type genres rating releaseYear description')
        .skip(skip)
        .limit(parseInt(limit)),
      Content.countDocuments(searchQuery)
    ]);

    // If text search returns no results, try regex search
    if (content.length === 0) {
      const regexQuery = {
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { 'cast.name': { $regex: q, $options: 'i' } },
          { director: { $regex: q, $options: 'i' } }
        ],
        status: 'published'
      };

      const [regexContent, regexTotal] = await Promise.all([
        Content.find(regexQuery)
          .select('title thumbnail type genres rating releaseYear description')
          .skip(skip)
          .limit(parseInt(limit)),
        Content.countDocuments(regexQuery)
      ]);

      return res.json({
        success: true,
        data: regexContent,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: regexTotal,
          pages: Math.ceil(regexTotal / parseInt(limit))
        }
      });
    }

    res.json({
      success: true,
      data: content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all genres
// @route   GET /api/content/genres
// @access  Public
exports.getAllGenres = async (req, res, next) => {
  try {
    const genres = await Content.distinct('genres', { status: 'published' });
    
    res.json({
      success: true,
      data: genres.sort()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new content (Admin)
// @route   POST /api/content
// @access  Private/Admin
exports.createContent = async (req, res, next) => {
  try {
    const content = await Content.create(req.body);

    res.status(201).json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update content (Admin)
// @route   PUT /api/content/:id
// @access  Private/Admin
exports.updateContent = async (req, res, next) => {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete content (Admin)
// @route   DELETE /api/content/:id
// @access  Private/Admin
exports.deleteContent = async (req, res, next) => {
  try {
    const content = await Content.findByIdAndDelete(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get series episodes
// @route   GET /api/content/:id/seasons/:seasonNumber/episodes
// @access  Public
exports.getEpisodes = async (req, res, next) => {
  try {
    const { id, seasonNumber } = req.params;

    const content = await Content.findById(id);

    if (!content || content.type !== 'series') {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    const season = content.seasons.find(s => s.seasonNumber === parseInt(seasonNumber));

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Season not found'
      });
    }

    res.json({
      success: true,
      data: season.episodes
    });
  } catch (error) {
    next(error);
  }
};
