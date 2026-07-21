const axios = require('axios');

// Mock restaurant data for fallback (images will be generated dynamically)
const mockRestaurants = [
  {
    placeId: 'mock_1',
    name: 'The Italian Corner',
    address: '123 Main St, Downtown',
    rating: 4.5,
    priceLevel: 2,
    cuisine: ['Italian', 'Mediterranean'],
    location: { lat: 40.7128, lng: -74.0060 },
    photoUrl: 'https://source.unsplash.com/400x300/?italian-food,pasta,pizza'
  },
  {
    placeId: 'mock_2',
    name: 'Sushi Palace',
    address: '456 Oak Ave, Midtown',
    rating: 4.7,
    priceLevel: 3,
    cuisine: ['Japanese', 'Sushi'],
    location: { lat: 40.7580, lng: -73.9855 },
    photoUrl: 'https://source.unsplash.com/400x300/?sushi,japanese-food'
  },
  {
    placeId: 'mock_3',
    name: 'Burger Bliss',
    address: '789 Elm St, Uptown',
    rating: 4.3,
    priceLevel: 1,
    cuisine: ['American', 'Burgers'],
    location: { lat: 40.7829, lng: -73.9654 },
    photoUrl: 'https://source.unsplash.com/400x300/?burger,american-food'
  },
  {
    placeId: 'mock_4',
    name: 'Spice Route',
    address: '321 Pine Rd, Eastside',
    rating: 4.6,
    priceLevel: 2,
    cuisine: ['Indian', 'Asian'],
    location: { lat: 40.7489, lng: -73.9680 },
    photoUrl: 'https://source.unsplash.com/400x300/?indian-food,curry'
  },
  {
    placeId: 'mock_5',
    name: 'Taco Fiesta',
    address: '654 Maple Dr, Westend',
    rating: 4.4,
    priceLevel: 1,
    cuisine: ['Mexican', 'Latin'],
    location: { lat: 40.7614, lng: -73.9776 },
    photoUrl: 'https://source.unsplash.com/400x300/?mexican-food,tacos'
  },
  {
    placeId: 'mock_6',
    name: 'Le Petit Bistro',
    address: '987 Cedar Ln, Central',
    rating: 4.8,
    priceLevel: 3,
    cuisine: ['French', 'European'],
    location: { lat: 40.7549, lng: -73.9840 },
    photoUrl: 'https://source.unsplash.com/400x300/?french-food,cuisine'
  },
  {
    placeId: 'mock_7',
    name: 'Green Garden',
    address: '147 Birch Way, Northside',
    rating: 4.5,
    priceLevel: 2,
    cuisine: ['Vegetarian', 'Healthy'],
    location: { lat: 40.7831, lng: -73.9712 },
    photoUrl: 'https://source.unsplash.com/400x300/?healthy-food,salad'
  },
  {
    placeId: 'mock_8',
    name: 'Dragon Wok',
    address: '258 Walnut Blvd, Chinatown',
    rating: 4.4,
    priceLevel: 2,
    cuisine: ['Chinese', 'Asian'],
    location: { lat: 40.7158, lng: -73.9970 },
    photoUrl: 'https://source.unsplash.com/400x300/?chinese-food,asian'
  },
  {
    placeId: 'mock_9',
    name: 'Mediterranean Breeze',
    address: '369 Spruce St, Harbor',
    rating: 4.6,
    priceLevel: 2,
    cuisine: ['Mediterranean', 'Greek'],
    location: { lat: 40.7282, lng: -74.0776 },
    photoUrl: 'https://source.unsplash.com/400x300/?mediterranean-food,greek'
  },
  {
    placeId: 'mock_10',
    name: 'BBQ Smokehouse',
    address: '741 Hickory Rd, Southside',
    rating: 4.5,
    priceLevel: 2,
    cuisine: ['BBQ', 'American'],
    location: { lat: 40.7061, lng: -74.0087 },
    photoUrl: 'https://source.unsplash.com/400x300/?bbq,grilled-meat'
  }
];

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

// Map cuisine types to OpenStreetMap tags
function getCuisineTag(cuisines) {
  const cuisineMap = {
    'italian': 'italian',
    'chinese': 'chinese',
    'japanese': 'japanese',
    'mexican': 'mexican',
    'indian': 'indian',
    'american': 'american',
    'thai': 'thai',
    'french': 'french',
    'mediterranean': 'mediterranean',
    'korean': 'korean',
    'vietnamese': 'vietnamese',
    'greek': 'greek',
    'spanish': 'spanish',
    'bbq': 'barbecue',
    'seafood': 'seafood'
  };

  if (!cuisines || cuisines.length === 0) {
    return '';
  }

  const mappedCuisines = cuisines
    .map(c => cuisineMap[c.toLowerCase()])
    .filter(Boolean);

  return mappedCuisines.length > 0 ? mappedCuisines.join('|') : '';
}

// Get cuisine-specific image using Unsplash Source (Free, no API key needed!)
function getCuisineImage(cuisineTypes, restaurantName) {
  // Map cuisines to food keywords for better images
  const cuisineImageMap = {
    'italian': 'italian-food-pasta-pizza',
    'chinese': 'chinese-food',
    'japanese': 'sushi-japanese-food',
    'mexican': 'mexican-food-tacos',
    'indian': 'indian-food-curry',
    'american': 'burger-american-food',
    'thai': 'thai-food',
    'french': 'french-food',
    'mediterranean': 'mediterranean-food',
    'korean': 'korean-food',
    'vietnamese': 'vietnamese-food-pho',
    'greek': 'greek-food',
    'spanish': 'spanish-food-paella',
    'barbecue': 'bbq-grilled-meat',
    'bbq': 'bbq-grilled-meat',
    'seafood': 'seafood-fish',
    'vegetarian': 'vegetarian-salad',
    'healthy': 'healthy-food-salad',
    'burger': 'burger',
    'burgers': 'burger',
    'pizza': 'pizza',
    'sushi': 'sushi'
  };

  // Get the first cuisine type and map it to an image keyword
  let imageKeyword = 'restaurant-food';

  if (cuisineTypes && cuisineTypes.length > 0) {
    const firstCuisine = cuisineTypes[0].toLowerCase();
    imageKeyword = cuisineImageMap[firstCuisine] || 'restaurant-food';
  }

  // Use Unsplash Source API - free, no API key required!
  // This provides random high-quality food images
  return `https://source.unsplash.com/400x300/?${imageKeyword},food,restaurant`;
}

// Fetch restaurants from OpenStreetMap Overpass API (Free, no API key needed!)
async function fetchFromOpenStreetMap(location, radius, cuisines, maxPrice) {
  try {
    const radiusMeters = radius * 1000; // Convert km to meters
    const cuisineTag = getCuisineTag(cuisines);

    // Build Overpass QL query
    let query = `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"](around:${radiusMeters},${location.lat},${location.lng});
        way["amenity"="restaurant"](around:${radiusMeters},${location.lat},${location.lng});
      );
      out body;
      >;
      out skel qt;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';

    const response = await axios.post(
    overpassUrl,
    query,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 20000
    }
    );

    console.log("\n========== OVERPASS API ==========");
    console.log("Location:", location);
    console.log("Radius (km):", radius);
    console.log("Cuisines:", cuisines);
    console.log("Response Elements:", response.data.elements?.length || 0);
    console.log("==================================\n");

    if (response.data && response.data.elements) {
      const restaurants = response.data.elements
        .filter(element => element.tags && element.tags.name)
        .map(element => {
          const tags = element.tags;

          // Determine price level based on various tags
          let priceLevel = 2; // default medium
          if (tags.price || tags['price:range']) {
            const priceInfo = tags.price || tags['price:range'];
            if (priceInfo.includes('$$$') || priceInfo.includes('expensive')) priceLevel = 3;
            else if (priceInfo.includes('$') || priceInfo.includes('cheap')) priceLevel = 1;
          }

          // Get cuisine types
          let cuisineTypes = [];
          if (tags.cuisine) {
            cuisineTypes = tags.cuisine.split(';').map(c =>
              c.trim().charAt(0).toUpperCase() + c.trim().slice(1)
            );
          }

          // Generate a simple rating (OSM doesn't have ratings, so we'll use a default or random)
          const rating = tags.stars ? parseFloat(tags.stars) : (3.5 + Math.random() * 1.3);

          // Get coordinates
          const lat = element.lat || (element.center ? element.center.lat : location.lat);
          const lng = element.lon || (element.center ? element.center.lon : location.lng);

          return {
            placeId: `osm_${element.id}`,
            name: tags.name,
            address: [
              tags['addr:housenumber'],
              tags['addr:street'],
              tags['addr:city']
            ].filter(Boolean).join(', ') || 'Address not available',
            rating: Math.min(5, Math.max(1, rating)),
            priceLevel: priceLevel,
            cuisine: cuisineTypes.length > 0 ? cuisineTypes : ['Restaurant'],
            location: { lat, lng },
            photoUrl: getCuisineImage(cuisineTypes, tags.name)
          };
        });

      // Filter by cuisine if specified
      let filtered = restaurants;
      if (cuisines && cuisines.length > 0) {
        filtered = restaurants.filter(restaurant => {
          return restaurant.cuisine.some(c =>
            cuisines.some(pref => c.toLowerCase().includes(pref.toLowerCase()))
          );
        });
      }

      // Filter by price
      filtered = filtered.filter(r => r.priceLevel <= maxPrice);

      // Add distance and filter
      filtered = filtered.map(restaurant => ({
        ...restaurant,
        distance: calculateDistance(
          location.lat,
          location.lng,
          restaurant.location.lat,
          restaurant.location.lng
        )
      })).filter(r => r.distance <= radius);

      // Sort by rating and distance
      filtered.sort((a, b) => {
        const scoreA = (a.rating * 0.7) - (a.distance * 0.3);
        const scoreB = (b.rating * 0.7) - (b.distance * 0.3);
        return scoreB - scoreA;
      });

      console.log("Sample restaurants:");
      console.log(filtered.slice(0, 5));
      console.log(`Found ${filtered.length} restaurants from OpenStreetMap`);
      return filtered.length > 0 ? filtered : null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching from OpenStreetMap:', error.message);
    return null;
  }
}

// Get mock restaurants based on criteria
function getMockRestaurants(centerLocation, maxDistance, cuisines, maxPrice) {
  const locationAwareRestaurants = mockRestaurants.map((restaurant, index) => ({
    ...restaurant,
    location: {
      lat: centerLocation.lat + (index % 3 - 1) * 0.008,
      lng: centerLocation.lng + (Math.floor(index / 3) % 3 - 1) * 0.008
    }
  }));

  let filtered = locationAwareRestaurants.filter(restaurant => {
    // Calculate distance
    const distance = calculateDistance(
      centerLocation.lat,
      centerLocation.lng,
      restaurant.location.lat,
      restaurant.location.lng
    );

    // Check distance
    if (distance > maxDistance) return false;

    // Check price level
    if (restaurant.priceLevel > maxPrice) return false;

    // Check cuisine match (if cuisines specified)
    if (cuisines.length > 0) {
      const hasMatchingCuisine = restaurant.cuisine.some(c =>
        cuisines.some(pref => c.toLowerCase().includes(pref.toLowerCase()))
      );
      if (!hasMatchingCuisine) return false;
    }

    return true;
  });

  // Add distance to each restaurant
  filtered = filtered.map(restaurant => ({
    ...restaurant,
    distance: calculateDistance(
      centerLocation.lat,
      centerLocation.lng,
      restaurant.location.lat,
      restaurant.location.lng
    )
  }));

  // Sort by rating and distance
  filtered.sort((a, b) => {
    const scoreA = (a.rating * 0.7) - (a.distance * 0.3);
    const scoreB = (b.rating * 0.7) - (b.distance * 0.3);
    return scoreB - scoreA;
  });

  return filtered;
}

// Main function to get restaurants
async function getRestaurants(centerLocation, maxDistance, cuisines, maxPrice) {
  // Try OpenStreetMap Overpass API first (Free, no API key needed!)
  const osmResults = await fetchFromOpenStreetMap(centerLocation, maxDistance, cuisines, maxPrice);

  if (osmResults && osmResults.length > 0) {
    return osmResults;
  }

  // Fallback to mock data if OpenStreetMap returns no results
  console.log('Using mock restaurant data as fallback');
  return getMockRestaurants(centerLocation, maxDistance, cuisines, maxPrice);
}

module.exports = {
  getRestaurants,
  calculateDistance
};
