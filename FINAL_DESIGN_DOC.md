# Chinese Grocery Finder — Final Design Doc (Changes since A4b)

## Scope
This document consolidates all design evolutions since Assignment 4b and briefly situates them against the Assignment 2 (A2) concept design. It emphasizes what changed, why, and how the pieces now fit together for the final build. Replace snapshot placeholders ([…snapshot…]) with your immutable links.

---

## 0) Executive Summary

We stabilized a clean, separable concept architecture (User, Store, Tagging, Review, Rating, Localization) and moved cross-concept effects into syncs.

We added a minimal, frontend-oriented API layer (full objects instead of only IDs) to eliminate overfetching and simplify the Vue client.

We made auth ID-only (no tokens issued by backend) and hardened the frontend store to persist login reliably across navigation/refresh.

We tightened data shapes (arrays over sets for API responses, consistent { userId } returns) and clarified ownership/cascades (user deletion, review propagation).

---

## 1) What Changed (A4b → Final)

### 1.1 Concepts (data & responsibilities)

#### User (new since A2; refined since A4b)

**State**: userId, username, email, passwordHash, creationDate.

**Actions**: registerUser, authenticateUser, getUserById, updateUserEmail, deleteUser.

**Rationale**: Makes identity first-class. Other concepts reference userId (not usernames/emails), enabling clean cascades and privacy.

**Since A4b**: solidified { userId } as the only auth artifact; frontend no longer depends on tokens.

#### Store (refined)

**State**: storeId, name, address, plus intrinsic fields now exposed to the UI: description, phone, hours, specialties, image.

**Actions**: createStore, deleteStore, getStoresByName, getStoresByAddress, getStoreById (supersedes _getStore).

**Since A4b**: standardized array responses; removed set semantics to match API ergonomics and JSON norms.

#### Tagging (refined)

**State**: storeId, tags: Set<String> (internally); API returns arrays.

**Actions**: addTag, removeTag, getStoresByTag.

**Since A4b**: _getStoresByTag returns [{ storeId, … }]-style objects per API spec; consistent with Store list endpoints.

#### Review (refined)

**State**: reviewId, storeId, userId, text, rating, tags[], createdAt.

**Actions**: createReview, deleteReview, getReviewsForStore, getReviewsByUser.

**Since A4b**: added full-object list endpoints (listReviewsForStore, listReviewsByUser) so the UI can render without N+1 fetches.

#### Rating (unchanged core; clarified integration)

**State**: storeId, aggregatedRating, reviewCount.

**Actions**: updateRating, getRating.

**Since A4b**: documented delta updates (±rating, ±weight) and the option to re-compute if business rules evolve.

#### Localization (kept minimal)

**State**: userId, preferredLanguage.

**Actions**: setLanguage, getLanguage.

**Since A4b**: unchanged in logic; clarified its relationship to User for future i18n surface.

### 1.2 Syncs (cross-concept orchestration)

#### AggregateReviewRating
When Review.createReview → Then Rating.updateRating(storeId, { rating, weight: 1 }).
**Since A4b**: affirmed uni-directional responsibility (Review owns events; Rating owns aggregates).

#### CascadeReviewDeletion
When Review.deleteReview → Then Rating.updateRating(storeId, { rating: -r.rating, weight: -1 }).
**Since A4b**: documented the recompute option if ratings move beyond simple averages.

#### CascadeUserDataDeletion
When User.deleteUser → Then Review.deleteReviewsByUser(userId) (and other user-owned data).
**Since A4b**: narrowed to actual stored links (we do not propagate email to Review, so no backfills required).

#### EnsureUserExistsForReview
Guards Review.createReview with User.exists(userId).
**Since A4b**: kept as a hard precondition, prevents orphaned reviews.

**Removed/Not Implemented**: "UpdateUserEmailInReviews" — unnecessary because Review stores only userId (immutable), not email.

### 1.3 API surface (frontend-convenience additions)

To support a Vue client without overfetching:

#### Store
- POST /api/Store/listStores → Store[] (full objects with description, phone, hours, specialties, image).
- POST /api/Store/getStoreById → Store.

#### Review
- POST /api/Review/listReviewsForStore → Review[] (full objects with tags[], createdAt).
- POST /api/Review/listReviewsByUser → Review[].

#### Tagging
- _getStoresByTag returns array of objects (not sets), aligning with Store list responses.

**Why**: These additions keep concepts decoupled while exposing query shapes optimized for UI (reduce round-trips; avoid N+1 lookups).

### 1.4 Authentication & Frontend state (critical stabilization)

**Backend**: Returns only { userId } on register/login (no tokens).

**Frontend (Pinia user store)**:
- Treats presence of `cgf_user_id` as authenticated; no token required.
- Hydrates from userCache/currentUser to eliminate flicker.
- Defensive guards prevent storing "undefined"/"null" IDs; on startup, invalid IDs are purged.
- Axios interceptor never logs out on 401/403 from public endpoints; only protected routes dispatch a forced logout event.

**Result**: Navigating away and back to My Account keeps the session; login state is stable and instant.

---

## 2) Frontend Changes Since A4b

### 2.1 Authentication & State Persistence

#### Centralized Storage Keys
**Added**: `src/utils/storageKeys.ts`
- Centralized all localStorage keys to prevent mismatches
- Keys: `cgf_user_id`, `cgf_auth_token`, `cgf_current_user`, `cgf_user_cache`
- Benefits: Single source of truth, easier maintenance, prevents typos

#### Robust Authentication Persistence
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

#### API Client Error Handling
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

#### Interceptor Improvements
**Changed**: `src/api/client.ts`

- **Token Validation**: Only attaches Authorization header if token exists and is not "dummy-token"
- **Public Endpoint Handling**: 401/403 on public endpoints (like listing stores) do not trigger logout
- **Custom Events**: Uses `auth:force-logout` event to decouple interceptor from store lifecycle
- **Error Logging**: Logs which endpoints trigger logout for debugging

### 2.2 Store Image Management

#### Store Image Utilities
**Added**: `src/utils/storeImages.ts`

- **Image Collection**: Centralized collection of Chinese grocery store images from Unsplash
- **Consistent Assignment**: `getStoreImageByStoreId()` ensures same store always gets same image
- **Fallback System**: Provides deterministic fallback images based on storeId hash

#### Store Detail Page Image Display
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

### 2.3 Review Display Improvements

#### Username Display
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

#### Review Tag Integration
**Note**: Review tags are displayed on reviews but are separate from store tags. Store tags are added via the Tagging concept, while review tags are part of the Review object.

### 2.4 Tag Management & Filtering

#### Dynamic Tag Filtering
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

#### Real-Time Tag Updates
**Changed**: `src/views/ProductsView.vue`

**Features**:
- **Watcher**: Watches `taggingStore.storeTags` for changes
- **Automatic Updates**: Store cards update immediately when tags change
- **Backend Refresh**: Falls back to backend fetch if tags are missing
- **State Sync**: Ensures UI reflects tagging store state in real-time

#### Tag Addition During Store Creation
**Changed**: `src/views/MyAccount.vue`

**Fix**:
- **Before**: Used `storeStore.addTag()` which only called API, didn't update local state
- **After**: Uses `taggingStore.addTag()` which updates both API and local state
- **Refresh**: After adding tags, refreshes tags from backend to ensure consistency

**Impact**: Tags now appear immediately on store cards after creation, without page refresh

### 2.5 State Management Improvements

#### Notification System
**Added**: `src/stores/notification.ts`, `src/components/NotificationToast.vue`

- **Centralized Notifications**: Single store for all UI notifications
- **Toast Component**: Reusable toast notification component
- **Types**: success, error, warning, info
- **Auto-dismiss**: Notifications automatically dismiss after timeout

#### Store State Updates
**Changed**: Various store files

- **Consistent State**: All stores now use consistent patterns for loading, error handling
- **localStorage Persistence**: Improved persistence logic with proper error handling
- **State Validation**: Added validation to prevent invalid state from persisting

### 2.6 API Client Enhancements

#### Response Validation
**Changed**: `src/api/client.ts`

**User Endpoints**:
- `registerUser()`: Validates `userId` in response before returning
- `authenticateUser()`: Validates `userId` and logs full response for debugging
- Error handling: Throws errors if required fields are missing

**Benefits**:
- Prevents storing invalid data (like `undefined` userId)
- Better error messages for debugging
- Catches backend response issues early

#### Debug Logging
**Added**: Comprehensive logging throughout API client

- Logs raw responses for authentication endpoints
- Logs response data and specific fields
- Helps identify backend response structure issues
- Can be removed in production if needed

### 2.7 UI/UX Improvements

#### Store Card Display
**Changed**: `src/views/ProductsView.vue`

- **Tag Display**: Shows both specialties (pink) and user tags (red with star)
- **Real-time Updates**: Tags update immediately when changed
- **Consistent Styling**: Unified tag styling across the app

#### Store Detail Page
**Changed**: `src/views/StoreDetail.vue`

- **Image Constraints**: Fixed width overflow issues
- **Store-Specific Images**: Only shows images for the specific store
- **Username Display**: Shows actual usernames in reviews
- **Tag Integration**: Displays store tags and review tags separately

### 2.8 Data Flow & Reactivity

#### Watchers
**Added**: Multiple watchers for real-time updates

- **Tag Changes**: Watches tagging store for tag updates
- **Review Changes**: Watches review store for review updates
- **Store Changes**: Watches store store for store updates
- **Auth Changes**: Watches user store for authentication state changes

#### Computed Properties
**Enhanced**: Computed properties for derived state

- **Available Tags**: Computed from all stores' tags
- **Filter Options**: Computed from available tags
- **Filtered Stores**: Computed from selected tag and search query
- **Main Image URL**: Computed from store image or fallback

### 2.9 Error Handling & Validation

#### Input Validation
**Enhanced**: Throughout the application

- **UserId Validation**: Prevents storing invalid userIds
- **Tag Validation**: Validates tags before adding
- **Store Validation**: Validates store data before creation
- **Review Validation**: Validates review data before creation

#### Error Recovery
**Improved**: Error handling with fallbacks

- **Network Errors**: Falls back to cached data when possible
- **Image Errors**: Falls back to utility function images
- **Username Errors**: Falls back to "User X" format
- **Tag Errors**: Falls back to empty array

### 2.10 Performance Optimizations

#### Caching
**Enhanced**: Caching strategies throughout

- **User Cache**: Caches user profiles to avoid redundant fetches
- **Store Cache**: Caches store data in localStorage
- **Tag Cache**: Caches tags in tagging store
- **Coordinate Cache**: Caches geocoded coordinates in localStorage

#### Lazy Loading
**Implemented**: Where appropriate

- **Route Components**: Lazy loaded route components
- **Images**: Images load on demand
- **Tags**: Tags fetched only when needed

### 2.11 Alignment with Backend Design

#### API Response Handling
**Aligned**: Frontend now properly handles backend responses

- **Array Responses**: Handles array responses from list endpoints
- **User ID Only**: Works with ID-only authentication (no tokens required)
- **Full Objects**: Uses full-object endpoints to avoid N+1 queries
- **Error Responses**: Properly handles error responses from backend

#### Concept Boundaries
**Respected**: Frontend respects concept boundaries

- **Store Tags**: Added via Tagging concept (not Store concept)
- **Review Tags**: Part of Review concept (displayed but separate)
- **User References**: Uses userId (not username/email) for references
- **Sync Awareness**: Frontend doesn't need to know about syncs

---

## 3) Rationale & Trade-offs

### Concept Isolation vs. Product Needs
We kept concepts minimal (single-purpose state + actions), pushing composition to syncs and API orchestration. The "frontend-friendly" endpoints do not violate concept boundaries—they're thin read combinators that return full documents where appropriate.

### Rating Updates
Delta updates are simple and efficient. We documented the option to re-compute (idempotent rebuild) if we later add edits to reviews or weighted schemes.

### ID-Only Auth
Simpler local persistence, fewer moving parts. If a real token/JWT is introduced later, the store already has hooks (auth header in axios) to support it without UI churn.

### Arrays over Sets in API
JSON and TypeScript ergonomics trump theoretical set semantics. We maintain set behavior internally (e.g., Tagging), but present arrays externally.

### Frontend State Management
Pinia stores provide reactive state management with localStorage persistence. The frontend handles UI state, caching, and optimistic updates while the backend remains the single source of truth for data.

---

## 4) How Final Differs from A2 & A4b (at a glance)

### From A2 → Final
- Added User as a first-class concept; Review/Localization now reference userId.
- Moved cross-entity logic into explicit syncs (aggregation, cascades, guards).
- Clarified Store as identity + address (with richer public fields exposed via API).
- Added frontend state management with Pinia stores and localStorage persistence.
- Implemented real-time UI updates through watchers and computed properties.

### From A4b → Final
- Introduced full-object list endpoints (Stores, Reviews) + consistent array responses.
- Refined auth to be ID-only with robust persistence in the Vue store.
- Finalized Tagging return shapes and Store getStoreById (deprecating _getStore).
- Added comprehensive error handling and validation in frontend.
- Implemented dynamic tag filtering based on user-created tags.
- Added store image management with fallback system.
- Implemented username display in reviews with caching.
- Added real-time tag updates on store cards.

---

## 5) Developer Notes (impl & testing)

### Snapshots
- A2 concept spec: […snapshot…]
- A4b visual/API spec: […snapshot…]
- Final concept spec: […snapshot…]
- Final syncs: […snapshot…]

### Testing Focus

#### Backend Testing
- Auth persistence: refresh, route changes, public 401s should not log out.
- Review cascades: deleting a review updates Rating (reviewCount/avg) deterministically.
- User deletion: removes authored reviews; no orphaned userId references.
- Tag filters: _getStoresByTag integrates with getStoreById/listStores render logic.

#### Frontend Testing
- **Authentication**: Test login persistence across page refreshes and navigation
- **Tag Updates**: Test that tags appear immediately after store creation
- **Username Display**: Test that usernames appear for all reviews, including old ones
- **Image Display**: Test that store images display correctly with fallbacks
- **Tag Filtering**: Test that dynamic tag filters work and update in real-time
- **Error Handling**: Test that errors are handled gracefully with fallbacks

### Frontend File Structure
```
src/
├── api/
│   └── client.ts              # API client with interceptors and error handling
├── components/
│   └── NotificationToast.vue  # Toast notification component
├── stores/
│   ├── user.ts                # User authentication and profile management
│   ├── store.ts               # Store data management
│   ├── review.ts              # Review data management
│   ├── rating.ts              # Rating data management
│   ├── tagging.ts             # Tag management
│   └── notification.ts        # UI notifications
├── utils/
│   ├── storageKeys.ts         # Centralized localStorage keys
│   └── storeImages.ts         # Store image utilities
├── views/
│   ├── MyAccount.vue          # User account and store creation
│   ├── ProductsView.vue       # Stores listing with tag filtering
│   ├── StoreDetail.vue        # Store details with reviews
│   └── HomeView.vue           # Home page
├── router/
│   └── index.ts               # Route definitions with auth guards
└── main.ts                    # App initialization and auth setup
```

---

## 6) Minimal Diagram (current flow)

```
User ──(userId)──▶ Review ──(storeId, rating)──▶ Rating
   │                                   ▲
   └──────────────▶ Localization       │
Store ◀──────────── Tagging ───────────┘

Syncs:
- Review.created  ➜ Rating.update(+)
- Review.deleted  ➜ Rating.update(-)
- User.deleted    ➜ Review.deleteByUser
- Guard: Review.created requires User.exists

Frontend:
- Pinia stores manage local state with localStorage persistence
- Watchers provide real-time UI updates
- API client handles authentication and error handling
- Components display data with proper fallbacks and error recovery
```

---

## 7) Open Extensions (post-MVP)

### Backend
- Review edits → rating re-compute job.
- Moderation & trust scores (weights in updateRating).
- Real tokens (optional): drop-in to axios interceptor; Pinia store already compatible.
- Search/Filters: pagination, geo filters, tag faceting.

### Frontend
- **Service Worker**: Add offline support with service worker
- **WebSocket**: Add real-time updates via WebSocket
- **Pagination**: Add pagination for stores and reviews
- **Advanced Search**: Add full-text search with filters
- **Image Upload**: Add image upload for store images
- **Review Editing**: Add ability to edit reviews
- **Tag Management**: Add UI for managing tags (edit, delete, merge)

---

## 8) Conclusion

We now have a principled, modular concept set with explicit syncs, a frontend-optimized API, and reliable auth persistence. The design stays faithful to concept isolation while meeting the product's usability and performance needs.

The frontend has been significantly improved to align with the backend design, provide better user experience, and ensure reliable authentication and data display. All changes maintain backward compatibility and include proper error handling and fallbacks.

### Key Achievements
- **Reliable Authentication**: Login state persists across page refreshes and navigation
- **Real-time Updates**: Tags, reviews, and store data update in real-time
- **User Experience**: Usernames displayed, store images with fallbacks, dynamic tag filtering
- **Error Resilience**: Comprehensive error handling with fallbacks and caching
- **Performance**: Efficient caching and lazy loading where appropriate
- **Maintainability**: Centralized utilities, consistent patterns, comprehensive logging

The system is now production-ready with a robust frontend that gracefully handles errors, provides real-time updates, and maintains consistent state across navigation and page refreshes.

