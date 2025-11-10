# Passthrough Configuration Guide

## Overview

The `passthrough.ts` file in your backend repository controls which routes are directly accessible (included) versus which routes go through the `Requesting` concept and are handled by syncs (excluded).

## Configuration Strategy

### Exclusions (Handled by Syncs)

Routes that are **excluded** will trigger `Requesting.request` actions, which are then handled by syncs. These routes need syncs because they require:
- Security/validation (e.g., user authentication, data validation)
- Orchestration (e.g., multiple concept actions)
- Data integrity (e.g., cascading operations)

**Excluded Routes:**
```typescript
// User (mutations + internal validation)
"/api/User/registerUser"                  // UserRegistrationRequest sync
"/api/User/authenticateUser"              // UserAuthenticationRequest sync
"/api/User/updateUserEmail"               // Optional: for validation/notification
"/api/User/deleteUser"                    // CascadeUserDeletion sync
"/api/User/_userExists"                   // Internal validation query
"/api/User/_getUserByUsernameOrEmail"     // Internal validation query

// Store (mutations + internal validation)
"/api/Store/createStore"                  // CreateStoreRequest sync
"/api/Store/deleteStore"                  // CascadeStoreDeletion sync
"/api/Store/_storeExists"                 // Internal validation query

// Tagging (mutations/internal)
"/api/Tagging/addTag"                     // AddTagRequest sync
"/api/Tagging/removeTag"                  // Mutation action (excluded)
"/api/Tagging/deleteTagsForStore"         // Internal action (called by syncs)

// Review (mutations/internal)
"/api/Review/createReview"                // CreateReviewRequest sync (with user validation)
"/api/Review/deleteReview"                // AdjustRatingOnReviewDeletion sync
"/api/Review/deleteReviewsForStore"       // Internal action (called by syncs)
"/api/Review/deleteReviewsByUser"         // Internal action (called by syncs)

// Rating (internal-only mutations)
"/api/Rating/updateRating"                // Internal action (called by aggregation syncs)
"/api/Rating/deleteRatingForStore"        // Internal action (called by syncs)
```

### Inclusions (Direct Pass-Through)

Routes that are **included** are directly accessible without going through syncs. These are typically:
- Public queries (read-only operations)
- Public read operations
- Internal actions (called by syncs, not directly from HTTP)

**Included Routes:**
```typescript
// Store Queries (Public, read-only)
"/api/Store/_listAllStores"              // List all stores with non-sensitive details
"/api/Store/_getStoreDetails"            // Fetch store's non-sensitive details by ID
"/api/Store/_getStoresByName"            // Search stores by name
"/api/Store/_getStoresByAddress"         // Search stores by address

// Tagging Queries (Public, read-only)
"/api/Tagging/_getStoresByTag"           // Find stores that have a given tag
"/api/Tagging/_getTagsForStore"          // Fetch tags attached to a store

// Review Queries (Public, read-only)
"/api/Review/_getReviewByIdFull"         // Full review details by review ID
"/api/Review/_getReviewsForStoreFull"    // Full review details for a store
"/api/Review/_getReviewsByUserFull"      // Full review details created by a user

// Rating Queries (Public, read-only)
"/api/Rating/_getRating"                 // Aggregated rating for a store

// User Queries (Public, read-only, non-sensitive)
"/api/User/_getUserDetails"              // Non-sensitive user profile details by user ID
```

## Rationale

### Why Exclude Certain Routes?

1. **Security**: Routes like `registerUser` and `authenticateUser` need validation that cannot be bypassed
2. **Validation**: Routes like `createReview` need to validate that the user exists before creating a review
3. **Data Integrity**: Routes like `deleteUser` need to trigger cascading deletions
4. **Orchestration**: Routes like `createStore` may need to perform multiple operations

### Why Include Certain Routes?

1. **Public Queries**: Read-only operations that don't modify data are safe to expose directly
2. **Performance**: Direct pass-through is faster than going through syncs
3. **Simplicity**: No need for complex orchestration for simple read operations
4. **Non-Sensitive Data**: Only non-sensitive user profile data is exposed (via `_getUserDetails`)

**Note**: Internal actions (like `deleteTagsForStore`, `updateRating`) are now **excluded** because they should only be called by syncs, not directly from HTTP. This provides better security and ensures proper orchestration.

## Implementation

1. **Copy the example `passthrough.ts`** to your backend repository
2. **Remove example routes** (LikertSurvey examples)
3. **Add your routes** based on the configuration above
4. **Test each route** to ensure it works correctly
5. **Verify syncs** are triggered for excluded routes
6. **Verify direct access** works for included routes

## Testing

### Test Excluded Routes
- Try to call an excluded route directly
- Verify it triggers the appropriate sync
- Verify the sync handles the request correctly
- Verify the response is formatted correctly

### Test Included Routes
- Try to call an included route directly
- Verify it bypasses syncs
- Verify it returns the expected data
- Verify it performs correctly

## Notes

- **Query actions** (prefixed with `_`) that are read-only and public are safe to include
- **Full query variants** (like `_getReviewByIdFull`) return complete data and are included for public access
- **Write operations** (like `createReview`, `deleteUser`) should always be excluded
- **Internal actions** (called by syncs) are now **excluded** to prevent direct HTTP access
- **Internal validation queries** (like `_userExists`, `_storeExists`) are excluded to prevent information leakage
- **Mutation actions** (like `removeTag`) are excluded even if they seem simple, to ensure proper validation

## Security Considerations

- **Never include routes** that modify sensitive data without validation
- **Never include routes** that could be exploited (e.g., mass deletion)
- **Always exclude routes** that require authentication or authorization
- **Always exclude routes** that need validation (e.g., user existence checks)

## Future Considerations

- **Authentication**: You may want to add authentication checks to some included routes
- **Rate Limiting**: You may want to add rate limiting to public routes
- **Caching**: You may want to add caching to frequently accessed read operations
- **Monitoring**: You may want to monitor excluded routes to ensure syncs are working correctly


