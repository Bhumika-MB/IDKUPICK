const axios = require('axios');

const OVERPASS_ENDPOINT = 'https://overpass.kumi.systems/api/interpreter';
const DEFAULT_RADIUS_KM = 5;
const DEFAULT_RATING = 4.0;
const DEFAULT_PRICE_LEVEL = 2;
const MAX_RESULTS = 10;

const CUISINE_ALIASES = {
  bbq: ['bbq', 'barbecue'],
  burger: ['burger', 'burgers'],
  burgers: ['burger', 'burgers'],
  chinese: ['chinese'],
  french: ['french'],
  greek: ['greek'],
  indian: ['indian'],
  italian: ['italian'],
  japanese: ['japanese', 'sushi'],
  korean: ['korean'],
  mexican: ['mexican'],
  mediterranean: ['mediterranean'],
  seafood: ['seafood'],
  spanish: ['spanish'],
  thai: ['thai'],
  vietnamese: ['vietnamese'],
  vegetarian: ['vegetarian'],
  vegan: ['vegan'],
  healthy: ['healthy'],
  american: ['american']
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeText(value = '') {
  return String(value).trim().toLowerCase();
}

function normalizeCuisineLabel(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '';

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function splitCuisineTags(tags = {}) {
  if (!tags.cuisine) return [];

  return String(tags.cuisine)
    .split(';')
    .map((cuisine) => cuisine.trim())
    .filter(Boolean)
    .map(normalizeCuisineLabel);
}

function inferCuisine(tags = {}) {
  const cuisines = splitCuisineTags(tags);
  return cuisines.length > 0 ? cuisines : ['Restaurant'];
}

function getCuisineMatchCount(restaurant, selectedCuisines = []) {
  if (!Array.isArray(selectedCuisines) || selectedCuisines.length === 0) {
    return 0;
  }

  const restaurantText = normalizeText([
    restaurant.name,
    restaurant.address,
    ...(restaurant.cuisine || [])
  ].join(' '));

  return selectedCuisines.reduce((count, cuisine) => {
    const normalizedCuisine = normalizeText(cuisine);
    if (!normalizedCuisine) return count;

    const aliases = CUISINE_ALIASES[normalizedCuisine] || [normalizedCuisine];
    const matched = aliases.some((alias) => restaurantText.includes(alias));
    return matched ? count + 1 : count;
  }, 0);
}

function normalizePriceLevel(tags = {}) {
  const priceText = String(tags.price || tags['price:range'] || tags['price_level'] || '').toLowerCase();

  if (!priceText) {
    return DEFAULT_PRICE_LEVEL;
  }

  if (
    priceText.includes('free') ||
    priceText.includes('cheap') ||
    priceText.includes('$') && !priceText.includes('$$')
  ) {
    return 1;
  }

  if (priceText.includes('moderate') || priceText.includes('mid') || priceText.includes('$$')) {
    return 2;
  }

  if (priceText.includes('expensive') || priceText.includes('high') || priceText.includes('$$$')) {
    return 3;
  }

  if (priceText.includes('luxury') || priceText.includes('$$$$')) {
    return 4;
  }

  return DEFAULT_PRICE_LEVEL;
}

function buildAddress(tags = {}) {
  return [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
    tags['addr:country']
  ]
    .filter(Boolean)
    .join(', ') || 'Address not available';
}

function buildOpenStreetMapUrl(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}`;
}

function getCoordinates(element) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { lat: element.lat, lng: element.lon };
  }

  if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
    return { lat: element.center.lat, lng: element.center.lon };
  }

  return null;
}

function buildOverpassQuery(location, radiusKm) {
  const radiusMeters = Math.max(1, Math.round(radiusKm * 1000));

  return `[out:json][timeout:25];
(
  node["amenity"="restaurant"](around:${radiusMeters},${location.lat},${location.lng});
  way["amenity"="restaurant"](around:${radiusMeters},${location.lat},${location.lng});
);
out center;`;
}

function toRestaurant(element, centerLocation, selectedCuisines) {
  if (!element || !element.tags || !element.tags.name) {
    return null;
  }

  const coordinates = getCoordinates(element);
  if (!coordinates) {
    return null;
  }

  const cuisine = inferCuisine(element.tags);
  const distance = calculateDistance(
    centerLocation.lat,
    centerLocation.lng,
    coordinates.lat,
    coordinates.lng
  );

  return {
    placeId: `osm_${element.type || 'element'}_${element.id}`,
    name: element.tags.name,
    address: buildAddress(element.tags),
    rating: DEFAULT_RATING,
    priceLevel: normalizePriceLevel(element.tags),
    cuisine,
    location: {
      lat: coordinates.lat,
      lng: coordinates.lng
    },
    distance,
    photoUrl: '',
    googleMapsUrl: buildOpenStreetMapUrl(coordinates.lat, coordinates.lng),
    cuisineMatchCount: getCuisineMatchCount(
      {
        name: element.tags.name,
        address: buildAddress(element.tags),
        cuisine
      },
      selectedCuisines
    )
  };
}

function applyFiltering(restaurants, centerLocation, radiusKm, cuisines, maxPrice) {
  const withinRadius = restaurants.filter((restaurant) => restaurant.distance <= radiusKm);
  const withinBudget = withinRadius.filter((restaurant) => restaurant.priceLevel <= maxPrice);

  if (!Array.isArray(cuisines) || cuisines.length === 0) {
    return withinBudget;
  }

  const matched = withinBudget.filter((restaurant) => restaurant.cuisineMatchCount > 0);
  return matched.length > 0 ? matched : withinBudget;
}

function sortRestaurants(restaurants) {
  return restaurants.sort((a, b) => {
    if (b.cuisineMatchCount !== a.cuisineMatchCount) {
      return b.cuisineMatchCount - a.cuisineMatchCount;
    }

    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }

    return a.name.localeCompare(b.name);
  });
}

async function fetchRestaurantsFromOverpass(centerLocation, radiusKm) {
  const query = buildOverpassQuery(centerLocation, radiusKm);

  const response = await axios.post(OVERPASS_ENDPOINT, query, {
    timeout: 25000,
    headers: {
      'Content-Type': 'text/plain',
      'User-Agent': 'IDKUPick/1.0'
    }
  });

  return Array.isArray(response.data?.elements) ? response.data.elements : [];
}

async function getRestaurants(centerLocation, maxDistance, cuisines, maxPrice) {
  if (!centerLocation || typeof centerLocation.lat !== 'number' || typeof centerLocation.lng !== 'number') {
    return [];
  }

  const radiusKm = typeof maxDistance === 'number' && maxDistance > 0 ? maxDistance : DEFAULT_RADIUS_KM;
  const budgetLimit = typeof maxPrice === 'number' && maxPrice > 0 ? maxPrice : DEFAULT_PRICE_LEVEL;

  try {
    const elements = await fetchRestaurantsFromOverpass(centerLocation, radiusKm);
    const restaurants = elements
      .map((element) => toRestaurant(element, centerLocation, cuisines || []))
      .filter(Boolean);

    const filtered = applyFiltering(restaurants, centerLocation, radiusKm, cuisines || [], budgetLimit);

    return sortRestaurants(filtered)
      .slice(0, MAX_RESULTS)
      .map(({ cuisineMatchCount, ...restaurant }) => restaurant);
  } catch (error) {
    return [];
  }
}

module.exports = {
  getRestaurants,
  calculateDistance
};
