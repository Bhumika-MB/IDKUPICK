# Implementation Complete

## Root Cause 1: Delete Group Button NOT Visible
**Problem**: The `isCreator` check used `String(group.creator?._id) === String(user?.id)`. In fallback mode, `group.creator` is the raw user object (not a MongoDB ObjectId), so `group.creator?._id` could be undefined or the ID could be at `group.creator.id` or `group.creator` itself.

**Fix**: Made `isCreator` check robust by handling all possible ID formats (MongoDB ObjectId, plain string, nested `_id`/`id`).

## Root Cause 2: Recommendations Not Refreshing After Preference Updates
**Problem**: In `recommendationController.js`, `generateRecommendations` persisted recommendations via `group.save()` only when MongoDB was connected. In **fallback mode** (no MongoDB), the recommendations were set on the local `group` variable but **never saved back** to the `fallbackGroupsById` Map. So when the GET endpoint fetched the group, it always got stale/empty recommendations.

**Fix**: 
1. Added `updateFallbackGroupRecommendations()` function in `fallbackStore.js` to persist recommendations to both `fallbackGroupsById` and `fallbackGroupsByCode` lookups.
2. Called it from `generateRecommendations` when not in MongoDB mode.
3. Already fixed the fallback path in `preferenceController.js` to clear recommendations.

## Files Modified (4 files)
1. `frontend/src/pages/GroupDetail.js` - Fixed `isCreator` and member check for robust ID comparison
2. `backend/utils/fallbackStore.js` - Added `updateFallbackGroupRecommendations()` + export
3. `backend/controllers/recommendationController.js` - Imported and called `updateFallbackGroupRecommendations` in fallback mode
4. `backend/services/restaurantService.js` - Fixed `isPermanentlyClosed()` + improved Google Maps URLs

