const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a group name'],
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    length: 6,
    uppercase: true
  },
  mood: {
    type: String,
    required: [true, 'Please select a mood'],
    enum: ['casual', 'fancy', 'quick', 'adventurous', 'comfort', 'healthy']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hasSubmittedPreferences: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active'
  },
  recommendation: {
    restaurants: [{
      placeId: String,
      name: String,
      address: String,
      rating: Number,
      priceLevel: Number,
      cuisine: [String],
      location: {
        lat: Number,
        lng: Number
      },
      photoUrl: String
    }],
    generatedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => Date.now() + 24 * 60 * 60 * 1000 // 24 hours from creation
  }
});

// Generate unique 6-character code
groupSchema.statics.generateGroupCode = async function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const existingGroup = await this.findOne({ code });
    if (!existingGroup) {
      isUnique = true;
    }
  }

  return code;
};

// Check if all members have submitted preferences
groupSchema.methods.allPreferencesSubmitted = function() {
  return this.members.every(member => member.hasSubmittedPreferences);
};

module.exports = mongoose.model('Group', groupSchema);
