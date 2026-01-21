const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['free', 'basic', 'standard', 'premium']
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    monthly: {
      type: Number,
      required: true
    },
    yearly: {
      type: Number,
      required: true
    }
  },
  features: [{
    name: String,
    included: Boolean
  }],
  limits: {
    videoQuality: {
      type: String,
      enum: ['SD', 'HD', 'FHD', 'UHD']
    },
    screens: {
      type: Number // Simultaneous streams
    },
    downloads: {
      type: Number // Number of downloads allowed
    }
  },
  stripePriceIds: {
    monthly: String,
    yearly: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
