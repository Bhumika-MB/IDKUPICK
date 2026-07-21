const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  cuisine: {
    type: [String],
    required: [true, 'Please select at least one cuisine type'],
    validate: {
      validator: function(v) {
        return v && v.length > 0 && v.length <= 3;
      },
      message: 'Please select 1-3 cuisine types'
    }
  },
  budget: {
    type: String,
    required: [true, 'Please select a budget range'],
    enum: ['low', 'medium', 'high']
  },
  distance: {
    type: Number,
    required: [true, 'Please specify maximum distance'],
    min: 1,
    max: 50
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index
preferenceSchema.index({ location: '2dsphere' });

// Compound index to ensure one preference per user per group
preferenceSchema.index({ user: 1, group: 1 }, { unique: true });

module.exports = mongoose.model('Preference', preferenceSchema);
