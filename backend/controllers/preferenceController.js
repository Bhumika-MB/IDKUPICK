const Preference = require('../models/Preference');
const Group = require('../models/Group');
const crypto = require('crypto');
const {
  isMongoReady,
  getFallbackGroupById,
  getFallbackGroupPreferences,
  getFallbackUserPreference,
  saveFallbackPreference
} = require('../utils/fallbackStore');

const getMemberId = (member) => String(member.user && member.user._id ? member.user._id : member.user);

const getGroup = async (groupId) => (
  isMongoReady() ? Group.findById(groupId) : getFallbackGroupById(groupId)
);

// @desc    Submit preferences
// @route   POST /api/preferences
// @access  Private
exports.submitPreferences = async (req, res) => {
  try {
    const { groupId, cuisine, budget, distance, location } = req.body;

    // Validate location
    if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
      return res.status(400).json({
        success: false,
        message: 'Location is required'
      });
    }

    // Check if group exists and user is a member
    const group = await getGroup(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(
      member => getMemberId(member) === String(req.user.id)
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Check if preferences already exist for this user in this group
    if (!isMongoReady()) {
      const preference = saveFallbackPreference({
        _id: getFallbackUserPreference(groupId, req.user.id)?._id || crypto.randomUUID(),
        user: req.user.id,
        group: groupId,
        cuisine: cuisine || [],
        budget,
        distance: Number(distance),
        location: { type: 'Point', coordinates: [Number(location.lng), Number(location.lat)] },
        updatedAt: new Date()
      });
      const member = group.members.find((item) => getMemberId(item) === String(req.user.id));
      if (member) member.hasSubmittedPreferences = true;
      return res.status(200).json({ success: true, data: { preference } });
    }

    let preference = await Preference.findOne({ user: req.user.id, group: groupId });

    if (preference) {
      // Update existing preferences
      preference.cuisine = cuisine;
      preference.budget = budget;
      preference.distance = distance;
      preference.location = {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      };
      await preference.save();
    } else {
      // Create new preferences
      preference = await Preference.create({
        user: req.user.id,
        group: groupId,
        cuisine,
        budget,
        distance,
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        }
      });
    }

    // Update member's submission status in group
    const memberIndex = group.members.findIndex(
      member => member.user.toString() === req.user.id
    );

    if (memberIndex !== -1) {
      group.members[memberIndex].hasSubmittedPreferences = true;
      await group.save();
    }

    res.status(200).json({
      success: true,
      data: { preference }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting preferences',
      error: error.message
    });
  }
};

// @desc    Get preferences for a group
// @route   GET /api/preferences/group/:groupId
// @access  Private
exports.getGroupPreferences = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check if group exists and user is a member
    const group = await getGroup(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(
      member => getMemberId(member) === String(req.user.id)
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Get all preferences for this group
    const preferences = isMongoReady()
      ? await Preference.find({ group: groupId }).populate('user', 'name email')
      : getFallbackGroupPreferences(groupId);

    res.status(200).json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching preferences',
      error: error.message
    });
  }
};

// @desc    Get user's preference for a specific group
// @route   GET /api/preferences/group/:groupId/me
// @access  Private
exports.getUserPreference = async (req, res) => {
  try {
    const { groupId } = req.params;

    const preference = isMongoReady()
      ? await Preference.findOne({ user: req.user.id, group: groupId }).populate('user', 'name email')
      : getFallbackUserPreference(groupId, req.user.id);

    res.status(200).json({
      success: true,
      data: { preference }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching preference',
      error: error.message
    });
  }
};

// @desc    Check if all group members have submitted preferences
// @route   GET /api/preferences/group/:groupId/status
// @access  Private
exports.getSubmissionStatus = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await getGroup(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(
      member => getMemberId(member) === String(req.user.id)
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    const allSubmitted = group.members.every((member) => member.hasSubmittedPreferences);
    const submittedCount = group.members.filter(m => m.hasSubmittedPreferences).length;
    const totalCount = group.members.length;

    res.status(200).json({
      success: true,
      data: {
        allSubmitted,
        submittedCount,
        totalCount,
        members: group.members
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching submission status',
      error: error.message
    });
  }
};
