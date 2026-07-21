const express = require('express');
const router = express.Router();
const {
  submitPreferences,
  getGroupPreferences,
  getUserPreference,
  getSubmissionStatus
} = require('../controllers/preferenceController');
const { protect } = require('../middleware/auth');

router.post('/', protect, submitPreferences);
router.get('/group/:groupId', protect, getGroupPreferences);
router.get('/group/:groupId/me', protect, getUserPreference);
router.get('/group/:groupId/status', protect, getSubmissionStatus);

module.exports = router;
