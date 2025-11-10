# Frontend Changes Since A4b

## Overview
This document details all frontend changes made to align with the backend design evolution and improve user experience, authentication reliability, and data visualization.

## 1. Authentication & State Persistence

### 1.1 Centralized Storage Keys
**Added**: `src/utils/storageKeys.ts`
- Centralized all localStorage keys to prevent mismatches
- Keys: `cgf_user_id`, `cgf_auth_token`, `cgf_current_user`, `cgf_user_cache`
- Benefits: Single source of truth, easier maintenance, prevents typos

### 1.2 Robust Authentication Persistence
**Changed**: `src/stores/user.ts`, `src/main.ts`, `src/router/index.ts`, `src/api/client.ts`

**Key Improvements**:
- **userId Validation**: Added strict validation to prevent storing `undefined`, `null`, or empty strings as userId
- **Startup Cleanup**: Automatically removes invalid userId values on app initialization
- **Token Handling**: Only stores real auth tokens (rejects "dummy-token" and invalid values)
- **Optimistic Auth**: Sets `isAuthenticated = true` immediately if userId exists in localStorage, preventing UI flicker
- **Cache Hydration**: Hydrates `currentUser` from `userCache` if available, even if profile fetch fails
- **Defensive Guards**: Multiple validation layers prevent invalid state from persisting

**Authentication Flow**:
1. On login: Validates `response.userId` before storing
2. On app start: Checks localStorage for userId, sets authenticated state immediately
3. On navigation: Router guard only checks auth if not already authenticated
4. On error: Network errors retain cached data; only 401/403 on protected endpoints trigger logout

### 1.3 API Client Error Handling
**Changed**: `src/api/client.ts`

**Improvements**:
- **Response Validation**: Validates API responses before returning (checks for `userId`, handles errors)
- **Debug Logging**: Added comprehensive logging for authentication requests/responses
- **Error Detection**: Checks for `error` field in responses before processing
- **Protected Endpoints**: Narrowed scope of auto-logout to only truly protected endpoints
- **Event-Based Logout**: Uses custom events instead of direct store imports to avoid circular dependencies

**Protected Endpoints List**:
- `/User/authenticateUser`
- `/User/_getUserDetails`
- `/User/updateUserEmail`
- `/User/deleteUser`
- `/Store/createStore`
- `/Review/createReview`
- `/Review/deleteReview`

### 1.4 Interceptor Improvements
**Changed**: `src/api/client.ts`

- **Token Validation**: Only attaches Authorization header if token exists and is not "dummy-token"
- **Public Endpoint Handling**: 401/403 on public endpoints (like listing stores) do not trigger logout
- **Custom Events**: Uses `auth:force-logout` event to decouple interceptor from store lifecycle
- **Error Logging**: Logs which endpoints trigger logout for debugging

## 2. Store Image Management

### 2.1 Store Image Utilities
**Added**: `src/utils/storeImages.ts`

- **Image Collection**: Centralized collection of Chinese grocery store images from Unsplash
- **Consistent Assignment**: `getStoreImageByStoreId()` ensures same store always gets same image
- **Fallback System**: Provides deterministic fallback images based on storeId hash

### 2.2 Store Detail Page Image Display
**Changed**: `src/views/StoreDetail.vue`

**Improvements**:
- **Store-Specific Images**: Each store shows only its assigned image(s), not gallery images
- **Proper Fallback**: Uses store.image if available, otherwise uses utility function
- **Error Handling**: Image load errors fallback to utility function image
- **Width Constraints**: Added proper CSS constraints to prevent images from overflowing
- **Conditional Navigation**: Navigation buttons only show if store has multiple images

**Image Loading Logic**:
1. If `store.image` exists and is valid → use it
2. Otherwise → use `getStoreImageByStoreId(storeId)` for consistent fallback
3. On image error → fallback to utility function image

## 3. Review Display Improvements

### 3.1 Username Display
**Changed**: `src/views/StoreDetail.vue`

**Features**:
- **Username Fetching**: Fetches usernames for all unique userIds in reviews
- **Caching**: Caches usernames in local state to avoid redundant API calls
- **Fallback**: Falls back to "User X" format if username fetch fails
- **Real-time Updates**: Watches for review changes and reloads usernames

**Implementation**:
- `loadUsernamesForReviews()`: Extracts unique userIds and fetches usernames
- Uses `userStore.fetchUserProfile()` which leverages caching
- Works for all reviews, including old ones created before this feature

### 3.2 Review Tag Integration
**Note**: Review tags are displayed on reviews but are separate from store tags. Store tags are added via the Tagging concept, while review tags are part of the Review object.

## 4. Tag Management & Filtering

### 4.1 Dynamic Tag Filtering
**Changed**: `src/views/ProductsView.vue`

**Replaced**: Hard-coded category filters with dynamic user-made tags

**Old Implementation**:
- Static categories: "Fresh Seafood", "Bakery & Hot Food", "Traditional Chinese", etc.
- Filtered by substring matching in specialties, tags, and descriptions

**New Implementation**:
- **Dynamic Tags**: Collects all unique tags from all stores
- **Filter Options**: "All Stores" + all unique tags sorted alphabetically
- **Exact Matching**: Filters stores by exact tag match (stores must have the selected tag)
- **Real-time Updates**: Filter options update automatically when tags are added/removed

**Benefits**:
- Reflects actual user-created tags in the system
- No hard-coded categories that may not match real data
- Automatically adapts as users add new tags
- More accurate filtering (exact match vs substring)

### 4.2 Real-Time Tag Updates
**Changed**: `src/views/ProductsView.vue`

**Features**:
- **Watcher**: Watches `taggingStore.storeTags` for changes
- **Automatic Updates**: Store cards update immediately when tags change
- **Backend Refresh**: Falls back to backend fetch if tags are missing
- **State Sync**: Ensures UI reflects tagging store state in real-time

### 4.3 Tag Addition During Store Creation
**Changed**: `src/views/MyAccount.vue`

**Fix**:
- **Before**: Used `storeStore.addTag()` which only called API, didn't update local state
- **After**: Uses `taggingStore.addTag()` which updates both API and local state
- **Refresh**: After adding tags, refreshes tags from backend to ensure consistency

**Impact**: Tags now appear immediately on store cards after creation, without page refresh

## 5. State Management Improvements

### 5.1 Notification System
**Added**: `src/stores/notification.ts`, `src/components/NotificationToast.vue`

- **Centralized Notifications**: Single store for all UI notifications
- **Toast Component**: Reusable toast notification component
- **Types**: success, error, warning, info
- **Auto-dismiss**: Notifications automatically dismiss after timeout

### 5.2 Store State Updates
**Changed**: Various store files

- **Consistent State**: All stores now use consistent patterns for loading, error handling
- **localStorage Persistence**: Improved persistence logic with proper error handling
- **State Validation**: Added validation to prevent invalid state from persisting

## 6. API Client Enhancements

### 6.1 Response Validation
**Changed**: `src/api/client.ts`

**User Endpoints**:
- `registerUser()`: Validates `userId` in response before returning
- `authenticateUser()`: Validates `userId` and logs full response for debugging
- Error handling: Throws errors if required fields are missing

**Benefits**:
- Prevents storing invalid data (like `undefined` userId)
- Better error messages for debugging
- Catches backend response issues early

### 6.2 Debug Logging
**Added**: Comprehensive logging throughout API client

- Logs raw responses for authentication endpoints
- Logs response data and specific fields
- Helps identify backend response structure issues
- Can be removed in production if needed

## 7. UI/UX Improvements

### 7.1 Store Card Display
**Changed**: `src/views/ProductsView.vue`

- **Tag Display**: Shows both specialties (pink) and user tags (red with star)
- **Real-time Updates**: Tags update immediately when changed
- **Consistent Styling**: Unified tag styling across the app

### 7.2 Store Detail Page
**Changed**: `src/views/StoreDetail.vue`

- **Image Constraints**: Fixed width overflow issues
- **Store-Specific Images**: Only shows images for the specific store
- **Username Display**: Shows actual usernames in reviews
- **Tag Integration**: Displays store tags and review tags separately

## 8. Data Flow & Reactivity

### 8.1 Watchers
**Added**: Multiple watchers for real-time updates

- **Tag Changes**: Watches tagging store for tag updates
- **Review Changes**: Watches review store for review updates
- **Store Changes**: Watches store store for store updates
- **Auth Changes**: Watches user store for authentication state changes

### 8.2 Computed Properties
**Enhanced**: Computed properties for derived state

- **Available Tags**: Computed from all stores' tags
- **Filter Options**: Computed from available tags
- **Filtered Stores**: Computed from selected tag and search query
- **Main Image URL**: Computed from store image or fallback

## 9. Error Handling & Validation

### 9.1 Input Validation
**Enhanced**: Throughout the application

- **UserId Validation**: Prevents storing invalid userIds
- **Tag Validation**: Validates tags before adding
- **Store Validation**: Validates store data before creation
- **Review Validation**: Validates review data before creation

### 9.2 Error Recovery
**Improved**: Error handling with fallbacks

- **Network Errors**: Falls back to cached data when possible
- **Image Errors**: Falls back to utility function images
- **Username Errors**: Falls back to "User X" format
- **Tag Errors**: Falls back to empty array

## 10. Performance Optimizations

### 10.1 Caching
**Enhanced**: Caching strategies throughout

- **User Cache**: Caches user profiles to avoid redundant fetches
- **Store Cache**: Caches store data in localStorage
- **Tag Cache**: Caches tags in tagging store
- **Coordinate Cache**: Caches geocoded coordinates in localStorage

### 10.2 Lazy Loading
**Implemented**: Where appropriate

- **Route Components**: Lazy loaded route components
- **Images**: Images load on demand
- **Tags**: Tags fetched only when needed

## 11. Alignment with Backend Design

### 11.1 API Response Handling
**Aligned**: Frontend now properly handles backend responses

- **Array Responses**: Handles array responses from list endpoints
- **User ID Only**: Works with ID-only authentication (no tokens required)
- **Full Objects**: Uses full-object endpoints to avoid N+1 queries
- **Error Responses**: Properly handles error responses from backend

### 11.2 Concept Boundaries
**Respected**: Frontend respects concept boundaries

- **Store Tags**: Added via Tagging concept (not Store concept)
- **Review Tags**: Part of Review concept (displayed but separate)
- **User References**: Uses userId (not username/email) for references
- **Sync Awareness**: Frontend doesn't need to know about syncs

## 12. Testing & Debugging

### 12.1 Debug Logging
**Added**: Comprehensive logging

- Authentication flow logging
- API response logging
- State change logging
- Error logging with stack traces

### 12.2 Development Tools
**Enhanced**: Developer experience

- Vue DevTools support
- TypeScript type checking
- ESLint for code quality
- Prettier for code formatting

## 13. Migration Notes

### 13.1 Breaking Changes
**None**: All changes are backward compatible

- Old localStorage data is automatically migrated
- Invalid data is cleaned up on startup
- Fallbacks ensure functionality even with missing data

### 13.2 Upgrade Path
**Smooth**: No manual migration required

1. Clear browser cache (optional but recommended)
2. Hard refresh browser (Ctrl+Shift+R)
3. Login again (if needed)
4. All new features work automatically

## 14. Future Considerations

### 14.1 Potential Enhancements
- **Token Support**: Frontend is ready for token-based auth if backend adds it
- **Pagination**: Can add pagination for stores/reviews if needed
- **Search**: Can enhance search with full-text search if backend supports it
- **Caching**: Can add service worker for offline support
- **Real-time**: Can add WebSocket support for real-time updates

### 14.2 Performance Monitoring
- Monitor API call counts
- Monitor localStorage usage
- Monitor render performance
- Monitor network requests

## Conclusion

The frontend has been significantly improved to align with the backend design, provide better user experience, and ensure reliable authentication and data display. All changes maintain backward compatibility and include proper error handling and fallbacks.

