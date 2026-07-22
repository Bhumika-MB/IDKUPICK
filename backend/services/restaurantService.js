const axios = require('axios');

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];
const DEFAULT_RADIUS_KM = 5;
const DEFAULT_RATING = 4.0;
const DEFAULT_PRICE_LEVEL = 2;
const MIN_RESULTS = 5;

// Well-known restaurant chains in India for popularity boosting
const POPULAR_CHAINS = [
  'mcdonald', 'kfc', 'burger king', 'pizza hut', 'domino', 'subway',
  'meghana', 'empire', 'truffles', 'a2b', 'udupi',
  'cafe coffee day', 'starbucks', 'barbeque nation', 'leon grill',
  'california burrito', 'polar bear', 'corner house',
  'absolute barbecues', 'nandhana', 'rameshwaram cafe',
  'taco bell', 'dunkin', 'baskin robbins', 'keventers',
  'chutney changa', 'toit', 'big brewsky', 'bob\'s bar',
  'mainland china', 'oh! calcutta', 'sichuan house',
  'adiga', 'kanti sweets', 'srinidhi', 'mavalli tiffin',
  'ctr', 'lake view milk bar', 'vidyarthi bhavan',
  'brahmins', 'idli factory', 'sagar', 'dasaprakash',
  'geetha', 'new shanthi sangeetha', 'annapoorna',
  'thalappakatti', 'dindigul thalappakatti',
  'hydrabadi biryani', 'paradise', 'biryani blues',
  'behrouz', 'dum safar', 'kayra', 'kebabs',
  'moti mahal', 'karim', 'bukhara', 'dhaba',
  'haka', 'chung wah', 'noodle bar', 'wok',
  'smoke house deli', 'hard rock cafe', 'tgi fridays'
];

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

const CUISINE_NAME_KEYWORDS = {
  italian: ['italian', 'pizza', 'pizzeria', 'pasta', 'trattoria', 'ristorante'],
  chinese: ['chinese', 'szechuan', 'dumpling', 'dim sum'],
  japanese: ['japanese', 'sushi', 'ramen', 'teriyaki', 'bento', 'tempura', 'yakitori', 'teppan', 'izakaya'],
  mexican: ['mexican', 'taco', 'burrito', 'quesadilla', 'taqueria', 'cantina'],
  indian: ['indian', 'curry', 'tandoori', 'biryani', 'masala'],
  thai: ['thai', 'pad thai', 'tom yum'],
  korean: ['korean', 'bulgogi', 'kimchi'],
  mediterranean: ['mediterranean', 'kebab', 'falafel', 'gyro', 'shawarma', 'hummus'],
  french: ['french', 'bistro', 'brasserie', 'patisserie'],
  american: ['american', 'burger', 'grill', 'diner', 'smokehouse', 'wing'],
  seafood: ['seafood', 'fish', 'oyster', 'lobster', 'crab'],
  vietnamese: ['vietnamese', 'pho', 'banh mi'],
  bbq: ['bbq', 'barbecue', 'rib'],
  healthy: ['healthy', 'salad', 'organic'],
  greek: ['greek', 'souvlaki', 'gyros'],
  spanish: ['spanish', 'tapas', 'paella'],
  vegetarian: ['vegetarian', 'veggie']
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeText(value) { return String(value || '').trim().toLowerCase(); }

function normalizeCuisineLabel(value) {
  const n = normalizeText(value);
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
}

function splitCuisineTags(tags) {
  if (!tags || !tags.cuisine) return [];
  return String(tags.cuisine).split(';').map(c => c.trim()).filter(Boolean).map(normalizeCuisineLabel);
}

function inferCuisine(tags, name) {
  const fromTags = splitCuisineTags(tags);
  if (fromTags.length > 0) return fromTags;
  if (name) {
    const lower = normalizeText(name);
    for (const [cuisine, keywords] of Object.entries(CUISINE_NAME_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) {
        return [cuisine.charAt(0).toUpperCase() + cuisine.slice(1)];
      }
    }
  }
  return ['Restaurant'];
}

function getCuisineMatchCount(restaurant, selectedCuisines) {
  if (!Array.isArray(selectedCuisines) || selectedCuisines.length === 0) return 0;
  const text = normalizeText([
    restaurant.name || '',
    restaurant.address || '',
    ...(restaurant.cuisine || [])
  ].join(' '));
  let matches = 0;
  selectedCuisines.forEach(cuisine => {
    const norm = normalizeText(cuisine);
    if (!norm) return;
    const aliases = CUISINE_ALIASES[norm] || [norm];
    const nameKw = CUISINE_NAME_KEYWORDS[norm] || [];
    if (aliases.some(a => text.includes(a)) || nameKw.some(k => text.includes(k))) matches++;
  });
  return matches;
}

function normalizePriceLevel(tags) {
  const p = String(tags.price || tags['price:range'] || tags['price_level'] || '').toLowerCase();
  if (!p) return DEFAULT_PRICE_LEVEL;
  if (p.includes('free') || p.includes('cheap') || (p.includes('$') && !p.includes('$$'))) return 1;
  if (p.includes('moderate') || p.includes('mid') || p.includes('$$')) return 2;
  if (p.includes('expensive') || p.includes('high') || p.includes('$$$')) return 3;
  if (p.includes('luxury') || p.includes('$$$$')) return 4;
  return DEFAULT_PRICE_LEVEL;
}

function buildAddress(tags) {
  const parts = [];
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:suburb']) parts.push(tags['addr:suburb']);
  if (tags['addr:district']) parts.push(tags['addr:district']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:state']) parts.push(tags['addr:state']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  if (tags['addr:country']) parts.push(tags['addr:country']);
  if (parts.length > 0) return parts.join(', ');
  return tags.address || tags['contact:address'] || tags['addr:full'] || 'Address not available';
}

function buildGoogleMapsUrl(lat, lng) {
  // Use the most accurate coordinates for Google Maps directions
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
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

// Build Overpass query that searches multiple amenity types and excludes closed/abandoned places
function buildOverpassQuery(location, radiusKm) {
  const r = Math.max(1, Math.round(radiusKm * 1000));
  // Search restaurant, fast_food, cafe, food_court; exclude disused/abandoned/demolished/construction
  return `[out:json][timeout:25];
(
  node["amenity"~"restaurant|fast_food|cafe|food_court"](
    around:${r},${location.lat},${location.lng}
  )["disused"!="yes"]["abandoned"!="yes"]["demolished"!="yes"]["construction"!="yes"];
  way["amenity"~"restaurant|fast_food|cafe|food_court"](
    around:${r},${location.lat},${location.lng}
  )["disused"!="yes"]["abandoned"!="yes"]["demolished"!="yes"]["construction"!="yes"];
);
out center;`;
}

// Check if a restaurant name matches a known popular chain
function getChainBoost(name) {
  if (!name) return 0;
  const lower = normalizeText(name);
  let bestBoost = 0;
  for (const chain of POPULAR_CHAINS) {
    if (lower.includes(chain)) {
      // Longer match = more specific chain = higher boost
      const boost = Math.min(chain.length * 2, 40);
      if (boost > bestBoost) bestBoost = boost;
    }
  }
  return bestBoost;
}

// Check if a name is valid (not purely symbols, not too short)
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  return trimmed.length >= 2;
}

// Check if restaurant seems permanently closed via OSM lifecycle tags
function isPermanentlyClosed(tags) {
  const lifecycleTags = [
    'disused', 'abandoned', 'demolished', 'razed',
    'ruins', 'was:amenity', 'was:building',
    'removed', 'destroyed'
  ];
  for (const tag of lifecycleTags) {
    const val = String(tags[tag] || '').toLowerCase();
    if (val === 'yes' || val === 'true' || val === '1') return true;
    // Also check lifecycle namespace: e.g. "disused:amenity" = "restaurant"
    if (tags[tag + ':amenity']) return true;
  }
  // Only check the explicit "closed" tag, NOT opening_hours text
  // opening_hours can say "Mo-Fr 09:00-17:00; Sa-Su closed" — that does NOT mean permanently closed
  const closedTag = String(tags.closed || '').toLowerCase();
  if (closedTag === 'yes' || closedTag === 'true' || closedTag === '1') return true;
  return false;
}

// Aggressive dedup: same name + within 50m = duplicate
function deduplicateRestaurants(restaurants) {
  const kept = [];
  for (const r of restaurants) {
    let isDup = false;
    for (const existing of kept) {
      if (existing.placeId === r.placeId) {
        isDup = true;
        break;
      }
      // Same name within 50 meters
      if (r.name && existing.name &&
          normalizeText(r.name) === normalizeText(existing.name) &&
          Math.abs(r.distance - existing.distance) < 0.05) {
        isDup = true;
        // Keep the one with more metadata
        const rScore = (r.tagsComplete ? 1 : 0) + (r.priceLevel !== DEFAULT_PRICE_LEVEL ? 1 : 0);
        const eScore = (existing.tagsComplete ? 1 : 0) + (existing.priceLevel !== DEFAULT_PRICE_LEVEL ? 1 : 0);
        if (rScore > eScore) {
          // Replace existing with this one
          Object.assign(existing, r);
        }
        break;
      }
    }
    if (!isDup) kept.push(r);
  }
  return kept;
}

function toRestaurant(element, centerLocation, selectedCuisines) {
  if (!element || !element.tags) return null;

  // Exclude permanently closed
  if (isPermanentlyClosed(element.tags)) return null;

  const coords = getCoordinates(element);
  if (!coords) return null;

  const name = element.tags.name || null;
  const cuisine = inferCuisine(element.tags, name);
  const distance = calculateDistance(centerLocation.lat, centerLocation.lng, coords.lat, coords.lng);
  const addr = buildAddress(element.tags);

  const r = {
    placeId: `osm_${element.type || 'e'}_${element.id}`,
    name: name || 'Unnamed Restaurant',
    address: addr,
    rating: DEFAULT_RATING,
    priceLevel: normalizePriceLevel(element.tags),
    cuisine,
    location: { lat: coords.lat, lng: coords.lng },
    distance,
    photoUrl: '',
    googleMapsUrl: buildGoogleMapsUrl(coords.lat, coords.lng),
    cuisineMatchCount: getCuisineMatchCount({ name, address: addr, cuisine }, selectedCuisines),
    // Track metadata quality
    tagsComplete: !!(element.tags.opening_hours || element.tags.website ||
                     element.tags.phone || element.tags.brand || element.tags.operator),
    hasPhone: !!element.tags.phone,
    hasWebsite: !!element.tags.website,
    hasHours: !!element.tags.opening_hours,
    hasBrand: !!(element.tags.brand || element.tags.operator)
  };

  // Calculate popularity score
  let popularity = 0;

  // Chain boost (strongest signal)
  const chainBoost = getChainBoost(name);
  popularity += chainBoost;

  // Cuisine specificity (named cuisine > generic "Restaurant")
  if (cuisine.length > 0 && cuisine[0] !== 'Restaurant') popularity += 10;

  // Name quality
  if (isValidName(name)) {
    popularity += 5;
    // Longer descriptive names often indicate better restaurants
    if (name.length > 10) popularity += 3;
    // Capitalization usually indicates proper name
    if (name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()) popularity += 2;
  } else {
    popularity -= 20; // Heavy penalty for bad names
  }

  // Address quality
  if (addr !== 'Address not available') popularity += 8;

  // Metadata completeness (opening_hours, website, phone, brand/operator)
  if (element.tags.opening_hours) popularity += 8;
  if (element.tags.website) popularity += 6;
  if (element.tags.phone) popularity += 6;
  if (element.tags.brand || element.tags.operator) popularity += 10;
  // brand=* is strongest — it means a known franchise
  if (element.tags.brand) popularity += 15;

  // Fast food and cafe get a small boost (these are more commonly used)
  const amenity = String(element.tags.amenity || '').toLowerCase();
  if (amenity === 'fast_food') popularity += 3;
  if (amenity === 'cafe') popularity += 2;

  r.popularity = popularity;

  // Quality score for secondary sorting
  r.qualityScore = 0;
  if (isValidName(name)) r.qualityScore += 5;
  if (addr !== 'Address not available') r.qualityScore += 4;
  if (cuisine.length > 0 && cuisine[0] !== 'Restaurant') r.qualityScore += 3;
  if (element.tags.cuisine) r.qualityScore += 2;
  if (r.tagsComplete) r.qualityScore += 3;

  return r;
}

async function fetchRestaurantsFromOverpass(location, radiusKm) {
  const query = buildOverpassQuery(location, radiusKm);
  const errors = [];

  for (let attempt = 0; attempt < OVERPASS_ENDPOINTS.length; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt];
    const timeout = attempt === 0 ? 10000 : 20000;
    try {
      const response = await axios.post(endpoint, query, {
        timeout,
        headers: { 'Content-Type': 'text/plain', 'User-Agent': 'IDKUPick/1.0' }
      });
      if (response.data && Array.isArray(response.data.elements)) {
        return response.data.elements;
      }
    } catch (err) {
      errors.push(endpoint + ': ' + err.message + ' (timeout=' + timeout + 'ms)');
      if (attempt < OVERPASS_ENDPOINTS.length - 1) {
        console.log('[RestaurantService] Endpoint ' + endpoint + ' failed, trying next...');
      }
    }
  }

  console.error('[RestaurantService] All Overpass endpoints exhausted: ' + errors.join(' | '));
  return [];
}

async function getRestaurants(centerLocation, maxDistance, cuisines, maxPrice) {
  if (!centerLocation || typeof centerLocation.lat !== 'number' || typeof centerLocation.lng !== 'number') {
    return [];
  }

  let radiusKm = typeof maxDistance === 'number' && maxDistance > 0 ? maxDistance : DEFAULT_RADIUS_KM;
  const budgetLimit = typeof maxPrice === 'number' && maxPrice > 0 ? maxPrice : DEFAULT_PRICE_LEVEL;

  // Progressive radius expansion: try user's radius, then 2x, then 4x
  let elements;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    elements = await fetchRestaurantsFromOverpass(centerLocation, radiusKm);
    if (elements && elements.length > 0) {
      // Check if we have enough potential results after parsing
      const preliminary = elements
        .map(el => toRestaurant(el, centerLocation, cuisines || []))
        .filter(Boolean);
      if (preliminary.length >= MIN_RESULTS) break;
    }
    attempts++;
    if (attempts < maxAttempts) {
      radiusKm *= 2;
    }
  }

  if (!elements || elements.length === 0) {
    return [];
  }

  let restaurants = elements
    .map(el => toRestaurant(el, centerLocation, cuisines || []))
    .filter(Boolean);

  if (restaurants.length === 0) return [];

  // Aggressive deduplication
  restaurants = deduplicateRestaurants(restaurants);

  if (restaurants.length === 0) return [];

  // Progressive filtering with automatic relaxation
  let filtered = restaurants;

  // Distance: relax if needed
  let distFiltered = restaurants.filter(r => r.distance <= radiusKm);
  if (distFiltered.length < MIN_RESULTS) {
    const doubled = radiusKm * 2;
    distFiltered = restaurants.filter(r => r.distance <= doubled);
  }
  if (distFiltered.length < MIN_RESULTS) {
    distFiltered = [...restaurants].sort((a, b) => a.distance - b.distance).slice(0, 30);
  }
  filtered = distFiltered;

  // Cuisine: relax if needed
  if (cuisines && cuisines.length > 0) {
    const matched = filtered.filter(r => r.cuisineMatchCount > 0);
    if (matched.length >= MIN_RESULTS) filtered = matched;
  }

  // Budget: relax if needed
  const budgetMatched = filtered.filter(r => r.priceLevel <= budgetLimit);
  if (budgetMatched.length >= MIN_RESULTS) filtered = budgetMatched;

  // Ultimate fallback: never return empty
  if (filtered.length === 0) {
    filtered = [...restaurants].sort((a, b) => a.distance - b.distance).slice(0, 10);
  }

  // Rank by: Cuisine match → Popularity → Distance → Name quality → Address quality
  const scored = filtered.map(r => ({
    ...r,
    rankScore:
      (r.cuisineMatchCount || 0) * 50 +        // Cuisine match (highest priority)
      (r.popularity || 0) * 3 +                  // Popularity (chain boost + metadata)
      Math.max(0, 20 - r.distance) +             // Proximity bonus (closer = better)
      (r.qualityScore || 0) * 1.5               // Data quality (name, address completeness)
  }));

  // Sort: rankScore descending, then cuisineMatch, then distance, then name
  scored.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    if (b.cuisineMatchCount !== a.cuisineMatchCount) return b.cuisineMatchCount - a.cuisineMatchCount;
    if (a.distance !== b.distance) return a.distance - b.distance;
    return (a.name || '').localeCompare(b.name || '');
  });

  const result = scored.slice(0, 10);

  // Strip internal fields before returning
  return result.map(({ popularity, qualityScore, tagsComplete, hasPhone, hasWebsite, hasHours, hasBrand, ...restaurant }) => restaurant);
}

module.exports = { getRestaurants, calculateDistance };
