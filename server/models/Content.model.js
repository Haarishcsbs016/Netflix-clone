const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  type: {
    type: String,
    enum: ['movie', 'series'],
    required: true,
    index: true
  },
  genres: [{
    type: String,
    index: true
  }],
  releaseYear: {
    type: Number,
    index: true
  },
  duration: {
    type: Number, // in minutes for movies
    required: function() { return this.type === 'movie'; }
  },
  rating: {
    type: String,
    enum: ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA']
  },
  imdbRating: {
    type: Number,
    min: 0,
    max: 10
  },
  language: {
    type: String,
    default: 'en'
  },
  subtitles: [{
    language: String,
    url: String
  }],
  cast: [{
    name: String,
    character: String,
    image: String
  }],
  director: {
    type: String
  },
  writers: [String],
  thumbnail: {
    type: String,
    required: true
  },
  bannerImage: {
    type: String
  },
  trailerUrl: {
    type: String
  },
  videoUrl: {
    type: String,
    required: function() { return this.type === 'movie'; }
  },
  videoQuality: [{
    quality: {
      type: String,
      enum: ['360p', '480p', '720p', '1080p', '4K']
    },
    url: String,
    size: Number // in MB
  }],
  seasons: [{
    seasonNumber: Number,
    title: String,
    episodes: [{
      episodeNumber: Number,
      title: String,
      description: String,
      duration: Number,
      thumbnail: String,
      videoUrl: String,
      releaseDate: Date
    }]
  }],
  tags: [String],
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  trending: {
    type: Boolean,
    default: false,
    index: true
  },
  newRelease: {
    type: Boolean,
    default: false,
    index: true
  },
  views: {
    type: Number,
    default: 0,
    index: true
  },
  likes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  subscriptionRequired: {
    type: String,
    enum: ['free', 'basic', 'standard', 'premium'],
    default: 'free',
    index: true
  },
  metadata: {
    budget: String,
    boxOffice: String,
    awards: [String],
    productionCompany: String
  }
}, {
  timestamps: true
});

// Virtual for total episodes in series
contentSchema.virtual('totalEpisodes').get(function() {
  if (this.type !== 'series') return 0;
  return this.seasons.reduce((total, season) => total + season.episodes.length, 0);
});

// Text search index
contentSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  'cast.name': 'text',
  director: 'text'
});

// Compound indexes for common queries
contentSchema.index({ type: 1, genres: 1, releaseYear: -1 });
contentSchema.index({ featured: 1, views: -1 });
contentSchema.index({ trending: 1, views: -1 });
contentSchema.index({ subscriptionRequired: 1, status: 1 });

module.exports = mongoose.model('Content', contentSchema);
