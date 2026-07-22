const Group = require('../models/Group');
const Preference = require('../models/Preference');
const { getRestaurants } = require('../services/restaurantService');
const {
  isMongoReady,
  getFallbackGroupById,
  getFallbackGroupPreferences,
  updateFallbackGroupRecommendations
} = require('../utils/fallbackStore');

const getMemberId = (member) => String(member.user && member.user._id ? member.user._id : member.user);
const getGroup = async (groupId) => (
  isMongoReady() ? Group.findById(groupId) : getFallbackGroupById(groupId)
);

// Aggregate preferences from all group members
function aggregatePreferences(preferences) {
  // Count cuisine preferences
  const cuisineCounts = {};
  preferences.forEach(pref => {
    pref.cuisine.forEach(c => {
      cuisineCounts[c] = (cuisineCounts[c] || 0) + 1;
    });
  });

  // Get top cuisines (most popular)
  const topCuisines = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine);

  // Calculate average location (center point)
  const avgLat = preferences.reduce((sum, p) => sum + p.location.coordinates[1], 0) / preferences.length;
  const avgLng = preferences.reduce((sum, p) => sum + p.location.coordinates[0], 0) / preferences.length;

  // Get maximum distance (take the minimum of all max distances to satisfy everyone)
  const maxDistance = Math.min(...preferences.map(p => p.distance));

  // Determine budget level (use median or most common)
  const budgetMap = { low: 1, medium: 2, high: 3 };
  const budgetValues = preferences.map(p => budgetMap[p.budget]);
  budgetValues.sort((a, b) => a - b);
  const medianBudget = budgetValues[Math.floor(budgetValues.length / 2)];

  return {
    cuisines: topCuisines,
    centerLocation: { lat: avgLat, lng: avgLng },
    maxDistance,
    maxPrice: medianBudget
  };
}

// Deduplicate restaurants by placeId (Overpass can return same POI as node + way)
function deduplicateRestaurants(restaurants) {
  const seen = new Set();
  return restaurants.filter(r => {
    if (seen.has(r.placeId)) return false;
    seen.add(r.placeId);
    return true;
  });
}

// Score restaurants based on group mood
function scoreRestaurantsByMood(restaurants, mood) {
  const moodPreferences = {
    casual: { priceWeight: -0.3, ratingWeight: 0.7 },
    fancy: { priceWeight: 0.5, ratingWeight: 0.5 },
    quick: { priceWeight: -0.5, ratingWeight: 0.5 },
    adventurous: { priceWeight: 0.2, ratingWeight: 0.8 },
    comfort: { priceWeight: 0, ratingWeight: 0.8 },
    healthy: { priceWeight: 0.2, ratingWeight: 0.8 }
  };

  const weights = moodPreferences[mood] || { priceWeight: 0, ratingWeight: 1 };

  return restaurants.map(restaurant => {
    const normalizedPrice = restaurant.priceLevel / 4;
    const normalizedRating = (restaurant.rating || 3) / 5;
    // Small proximity bonus: closer restaurants score slightly higher
    const proximityBonus = restaurant.distance ? Math.max(0, 1 - restaurant.distance / 50) * 0.1 : 0;

    const score =
      (normalizedRating * weights.ratingWeight) +
      (normalizedPrice * weights.priceWeight) +
      proximityBonus;

    return {
      ...restaurant,
      score
    };
  }).sort((a, b) => b.score - a.score);
}

// @desc    Generate restaurant recommendations for a group
// @route   POST /api/recommendations/:groupId
// @access  Private
exports.generateRecommendations = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Get group and verify user is a member
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

    // Check if all members have submitted preferences
    if (!group.members.every((member) => member.hasSubmittedPreferences)) {
      return res.status(400).json({
        success: false,
        message: 'Not all members have submitted their preferences'
      });
    }

    // Get all preferences
    const preferences = isMongoReady()
      ? await Preference.find({ group: groupId })
      : getFallbackGroupPreferences(groupId);

    if (preferences.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No preferences found for this group'
      });
    }

    // Aggregate preferences
    const aggregated = aggregatePreferences(preferences);

    // Get restaurants
    let restaurants = await getRestaurants(
      aggregated.centerLocation,
      aggregated.maxDistance,
      aggregated.cuisines,
      aggregated.maxPrice
    );

    if (!restaurants || restaurants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No restaurants found matching your preferences'
      });
    }

    // Deduplicate (Overpass can return same POI as both node and way)
    restaurants = deduplicateRestaurants(restaurants);

    // Score restaurants based on mood
    restaurants = scoreRestaurantsByMood(restaurants, group.mood);

    // Take top 3 recommendations
    const topRecommendations = restaurants.slice(0, 3);

    // Update group with recommendations
    group.recommendation = {
      restaurants: topRecommendations,
      generatedAt: new Date()
    };
    if (isMongoReady()) {
      await group.save();
    } else {
      // Persist to fallback store so GET endpoint retrieves fresh recommendations
      updateFallbackGroupRecommendations(groupId, topRecommendations);
    }

    res.status(200).json({
      success: true,
      data: {
        recommendations: topRecommendations,
        aggregatedPreferences: {
          cuisines: aggregated.cuisines,
          centerLocation: aggregated.centerLocation,
          maxDistance: aggregated.maxDistance,
          budget: aggregated.maxPrice === 1 ? 'low' : aggregated.maxPrice === 2 ? 'medium' : 'high'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
};

// @desc    Get existing recommendations for a group
// @route   GET /api/recommendations/:groupId
// @access  Private
exports.getRecommendations = async (req, res) => {
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

    if (!group.recommendation || !group.recommendation.restaurants || group.recommendation.restaurants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No recommendations available yet'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        recommendations: group.recommendation.restaurants,
        generatedAt: group.recommendation.generatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
      error: error.message
    });
  }
};
