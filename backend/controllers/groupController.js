const Group = require('../models/Group');
const Preference = require('../models/Preference');
const {
  isMongoReady,
  generateFallbackGroupCode,
  addFallbackGroup,
  getFallbackGroupById,
  getFallbackGroupByCode,
  getFallbackUserGroups,
  presentFallbackGroup,
  deleteFallbackGroup
} = require('../utils/fallbackStore');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { name, mood } = req.body;

    if (isMongoReady()) {
      const code = await Group.generateGroupCode();
      const group = await Group.create({
        name,
        code,
        mood,
        creator: req.user.id,
        members: [{
          user: req.user.id,
          hasSubmittedPreferences: false
        }]
      });

      await group.populate('creator', 'name email');
      await group.populate('members.user', 'name email');

      return res.status(201).json({
        success: true,
        data: { group }
      });
    }

    const userId = req.user.id || req.user._id;
    const group = addFallbackGroup({
      _id: `${Date.now()}`,
      name,
      code: generateFallbackGroupCode(),
      mood,
      creator: userId,
      members: [{
        user: userId,
        hasSubmittedPreferences: false,
        joinedAt: new Date()
      }],
      status: 'active',
      recommendation: { restaurants: [], generatedAt: null },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    return res.status(201).json({
      success: true,
      data: { group: presentFallbackGroup(group) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating group',
      error: error.message
    });
  }
};

// @desc    Join a group by code
// @route   POST /api/groups/join
// @access  Private
exports.joinGroup = async (req, res) => {
  try {
    const { code } = req.body;

    if (isMongoReady()) {
      const group = await Group.findOne({ code: code.toUpperCase(), status: 'active' });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found or expired'
        });
      }

      const isMember = group.members.some(
        member => member.user.toString() === req.user.id
      );

      if (isMember) {
        return res.status(400).json({
          success: false,
          message: 'You are already a member of this group'
        });
      }

      group.members.push({
        user: req.user.id,
        hasSubmittedPreferences: false
      });

      await group.save();

      await group.populate('creator', 'name email');
      await group.populate('members.user', 'name email');

      return res.status(200).json({
        success: true,
        data: { group }
      });
    }

    const userId = req.user.id || req.user._id;
    const group = getFallbackGroupByCode(code);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or expired'
      });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.user.id
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    group.members.push({
      user: userId,
      hasSubmittedPreferences: false,
      joinedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      data: { group: presentFallbackGroup(group) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error joining group',
      error: error.message
    });
  }
};

// @desc    Get group by code or ID
// @route   GET /api/groups/:identifier
// @access  Private
exports.getGroup = async (req, res) => {
  try {
    const { identifier } = req.params;
    let group;

    if (isMongoReady()) {
      if (identifier.length === 6) {
        group = await Group.findOne({ code: identifier.toUpperCase() })
          .populate('creator', 'name email')
          .populate('members.user', 'name email');
      } else {
        group = await Group.findById(identifier)
          .populate('creator', 'name email')
          .populate('members.user', 'name email');
      }
    } else {
      if (identifier.length === 6) {
        group = getFallbackGroupByCode(identifier);
      } else {
        group = getFallbackGroupById(identifier);
      }
    }

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some((member) => {
      const memberId = member.user && member.user._id ? member.user._id : member.user;
      return String(memberId) === req.user.id;
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    res.status(200).json({
      success: true,
      data: { group: isMongoReady() ? group : presentFallbackGroup(group) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching group',
      error: error.message
    });
  }
};

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
exports.getUserGroups = async (req, res) => {
  try {
    if (isMongoReady()) {
      const groups = await Group.find({
        'members.user': req.user.id,
        status: 'active'
      })
        .populate('creator', 'name email')
        .populate('members.user', 'name email')
        .sort('-createdAt');

      return res.status(200).json({
        success: true,
        data: { groups }
      });
    }

    const groups = getFallbackUserGroups(req.user.id);

    return res.status(200).json({
      success: true,
      data: { groups: groups.map(presentFallbackGroup) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: error.message
    });
  }
};

// @desc    Update group status
// @route   PUT /api/groups/:id/status
// @access  Private
exports.updateGroupStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can update the status'
      });
    }

    group.status = status;
    await group.save();

    res.status(200).json({
      success: true,
      data: { group }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating group status',
      error: error.message
    });
  }
};

// @desc    Delete a group
// @route   DELETE /api/groups/:id
// @access  Private
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoReady()) {
      const group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      if (group.creator.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only the group creator can delete the group'
        });
      }

      await Preference.deleteMany({ group: id });
      await Group.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: 'Group and associated preferences deleted successfully'
      });
    }

    // Fallback mode
    const group = getFallbackGroupById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const userId = req.user.id || req.user._id;
    if (String(group.creator) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can delete the group'
      });
    }

    deleteFallbackGroup(id);

    return res.status(200).json({
      success: true,
      message: 'Group and associated preferences deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting group',
      error: error.message
    });
  }
};
