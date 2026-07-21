const express = require('express');
const router = express.Router();
const {
  generateRecommendations,
  getRecommendations
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/auth');

router.post('/:groupId', protect, generateRecommendations);
router.get('/:groupId', protect, getRecommendations);

module.exports = router;
