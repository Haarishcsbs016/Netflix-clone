const User = require('../models/User.model');
const Content = require('../models/Content.model');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('watchlist', 'title thumbnail type genres rating')
      .populate('watchHistory.contentId', 'title thumbnail type');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'phoneNumber', 'dateOfBirth', 'avatar', 'preferences'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user watchlist
// @route   GET /api/users/watchlist
// @access  Private
exports.getWatchlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('watchlist', 'title thumbnail type genres rating releaseYear duration');

    res.json({
      success: true,
      data: user.watchlist
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add to watchlist
// @route   POST /api/users/watchlist/:contentId
// @access  Private
exports.addToWatchlist = async (req, res, next) => {
  try {
    const { contentId } = req.params;

    // Verify content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Check if already in watchlist
    if (req.user.watchlist.includes(contentId)) {
      return res.status(400).json({
        success: false,
        message: 'Content already in watchlist'
      });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { watchlist: contentId } }
    );

    res.json({
      success: true,
      message: 'Added to watchlist'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove from watchlist
// @route   DELETE /api/users/watchlist/:contentId
// @access  Private
exports.removeFromWatchlist = async (req, res, next) => {
  try {
    const { contentId } = req.params;

    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { watchlist: contentId } }
    );

    res.json({
      success: true,
      message: 'Removed from watchlist'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get watch history
// @route   GET /api/users/history
// @access  Private
exports.getWatchHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'watchHistory.contentId',
        select: 'title thumbnail type genres rating duration'
      });

    // Paginate and sort by watch date
    const sortedHistory = user.watchHistory
      .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: sortedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: user.watchHistory.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear watch history
// @route   DELETE /api/users/history
// @access  Private
exports.clearWatchHistory = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { watchHistory: [] } }
    );

    res.json({
      success: true,
      message: 'Watch history cleared'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profiles
// @route   GET /api/users/profiles
// @access  Private
exports.getProfiles = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: user.profiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new profile
// @route   POST /api/users/profiles
// @access  Private
exports.createProfile = async (req, res, next) => {
  try {
    const { name, avatar, isKids } = req.body;

    const user = await User.findById(req.user._id);

    // Check profile limit (max 5 profiles)
    if (user.profiles.length >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 profiles allowed'
      });
    }

    user.profiles.push({
      name,
      avatar: avatar || 'default-profile.png',
      isKids: isKids || false,
      preferences: { genres: [], languages: [] }
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: user.profiles[user.profiles.length - 1]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/users/profiles/:profileId
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const { name, avatar, isKids, preferences } = req.body;

    const user = await User.findById(req.user._id);

    const profileIndex = user.profiles.findIndex(p => p._id.toString() === profileId);
    if (profileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    if (name) user.profiles[profileIndex].name = name;
    if (avatar) user.profiles[profileIndex].avatar = avatar;
    if (isKids !== undefined) user.profiles[profileIndex].isKids = isKids;
    if (preferences) user.profiles[profileIndex].preferences = preferences;

    await user.save();

    res.json({
      success: true,
      data: user.profiles[profileIndex]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete profile
// @route   DELETE /api/users/profiles/:profileId
// @access  Private
exports.deleteProfile = async (req, res, next) => {
  try {
    const { profileId } = req.params;

    const user = await User.findById(req.user._id);

    // Prevent deleting last profile
    if (user.profiles.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last profile'
      });
    }

    user.profiles = user.profiles.filter(p => p._id.toString() !== profileId);
    await user.save();

    res.json({
      success: true,
      message: 'Profile deleted'
    });
  } catch (error) {
    next(error);
  }
};
