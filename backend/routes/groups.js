const express = require('express');
const router = express.Router();
const {
  createGroup,
  joinGroup,
  getGroup,
  getUserGroups,
  updateGroupStatus
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createGroup);
router.post('/join', protect, joinGroup);
router.get('/', protect, getUserGroups);
router.get('/:identifier', protect, getGroup);
router.put('/:id/status', protect, updateGroupStatus);

module.exports = router;
