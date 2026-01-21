const mongoose = require('mongoose');

const playbackSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true,
    index: true
  },
  episodeId: {
    type: String // For series episodes
  },
  progress: {
    currentTime: {
      type: Number,
      default: 0 // in seconds
    },
    duration: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0
    }
  },
  completed: {
    type: Boolean,
    default: false
  },
  device: {
    type: String,
    userAgent: String,
    ip: String
  },
  quality: {
    type: String,
    enum: ['360p', '480p', '720p', '1080p', '4K', 'auto'],
    default: 'auto'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  sessionDuration: {
    type: Number, // Total watch time in seconds
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
playbackSessionSchema.index({ userId: 1, contentId: 1 });
playbackSessionSchema.index({ userId: 1, lastUpdated: -1 });

// Update percentage before saving
playbackSessionSchema.pre('save', function(next) {
  if (this.progress.duration > 0) {
    this.progress.percentage = (this.progress.currentTime / this.progress.duration) * 100;
    
    // Mark as completed if watched more than 90%
    if (this.progress.percentage >= 90) {
      this.completed = true;
    }
  }
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('PlaybackSession', playbackSessionSchema);
