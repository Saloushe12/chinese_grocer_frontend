# Final Sync Implementation Guide

## Overview

This guide provides the complete, final sync implementations adjusted to match the actual backend concept implementation patterns.

## Key Backend Patterns

### Return Types
- **Actions (create/update)**: `{ result: ID } | { error: string }`
- **Actions (delete)**: `{} | { error: string }` OR `{ data } | { error: string }` (for deleteReview)
- **Queries**: Return data directly (`ReviewDoc | null`, `Set<ID>`, etc.)

### Error Handling
- Never throw exceptions
- Always return structured error objects: `{ error: string }`
- Queries return `null` or empty collections on error

## Critical Backend Modifications Required

### 1. Review Concept - Modify deleteReview

**Current Implementation:**
```typescript
async deleteReview({ reviewId }: { reviewId: ID }): Promise<Empty | { error: string }> {
  // ... deletes and returns {}
}
```

**Required Modification:**
```typescript
async deleteReview({ reviewId }: { reviewId: ID }): Promise<{ storeId: Store, rating: number } | { error: string }> {
  try {
    // FIRST: Get the review data BEFORE deletion
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    if (!review) {
      return { error: `Review with ID '${reviewId}' not found.` };
    }
    
    const { storeId, rating } = review;
    
    // THEN: Delete the review
    await this.reviewsCollection.deleteOne({ _id: reviewId });
    
    // RETURN: The data needed for AdjustRatingOnReviewDeletion sync
    return { storeId, rating };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { error: `Internal server error: ${message}` };
  }
}
```

**Why**: The `AdjustRatingOnReviewDeletion` sync needs the review's `storeId` and `rating` to adjust the aggregated rating. Once the review is deleted, this data is lost, so we must return it before deletion.

## Passthrough Configuration

Based on the sync requirements, here's the final `passthrough.ts` configuration:

```typescript
// src/concepts/Requesting/passthrough.ts
import "jsr:@std/dotenv/load";

const BASE = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
const R = (concept: string, action: string) => `${BASE}/${concept}/${action}`;

/**
 * INCLUSIONS
 * Public, read-only queries only. No mutating actions or internal validation queries here.
 */
export const inclusions: Record<string, string> = {
  // --- Store (queries that exist) ---
  [R("Store", "_listAllStores")]:
    "Public read; list all stores with non-sensitive details.",
  [R("Store", "_getStoreDetails")]:
    "Public read; fetch a store's non-sensitive details by ID.",
  [R("Store", "_getStoresByName")]: "Public read; search stores by name.",
  [R("Store", "_getStoresByAddress")]: "Public read; search stores by address.",

  // --- Tagging (queries that exist) ---
  [R("Tagging", "_getStoresByTag")]:
    "Public read; find stores that have a given tag.",
  [R("Tagging", "_getTagsForStore")]:
    "Public read; fetch tags attached to a store.",

  // --- Review (queries that exist) ---
  [R("Review", "_getReviewByIdFull")]:
    "Public read; full review details by review ID.",
  [R("Review", "_getReviewsForStoreFull")]:
    "Public read; full review details for a store.",
  [R("Review", "_getReviewsByUserFull")]:
    "Public read; full review details created by a user.",

  // --- Rating (query that exists) ---
  [R("Rating", "_getRating")]: "Public read; aggregated rating for a store.",

  // --- User (safe, non-sensitive profile read) ---
  [R("User", "_getUserDetails")]:
    "Public read; non-sensitive user profile details by user ID.",
};

/**
 * EXCLUSIONS
 * Everything here must go through Requesting.request + your syncs.
 * Include all mutating actions and internal validation queries.
 */
export const exclusions: string[] = [
  // --- User (mutations + internal validation) ---
  R("User", "registerUser"),
  R("User", "authenticateUser"),
  R("User", "updateUserEmail"),
  R("User", "deleteUser"),
  R("User", "_userExists"),
  R("User", "_getUserByUsernameOrEmail"),

  // --- Store (mutations + internal validation) ---
  R("Store", "createStore"),
  R("Store", "deleteStore"),
  R("Store", "_storeExists"),

  // --- Tagging (mutations/internal) ---
  R("Tagging", "addTag"),
  R("Tagging", "removeTag"),
  R("Tagging", "deleteTagsForStore"),

  // --- Review (mutations/internal) ---
  R("Review", "createReview"),
  R("Review", "deleteReview"),
  R("Review", "deleteReviewsForStore"),
  R("Review", "deleteReviewsByUser"),

  // --- Rating (internal-only mutations) ---
  R("Rating", "updateRating"),
  R("Rating", "deleteRatingForStore"),
];
```

**Key Changes:**
- Uses `R()` helper function for route construction with configurable BASE URL
- Only includes public, read-only queries (no mutations)
- Excludes all internal actions (even those called by syncs) to prevent direct HTTP access
- Excludes internal validation queries (`_userExists`, `_storeExists`, etc.) to prevent information leakage
- Uses "Full" variants for Review queries (`_getReviewByIdFull`, etc.)
- Uses `_getUserDetails` instead of `_getUserById` for public user profile access

## Sync Implementation Summary

### Request-Response Syncs

All request-response syncs follow the same pattern:
1. **Request Sync**: Detects HTTP request, invokes concept action
2. **Response Success Sync**: Matches on success output (`{ result }`), sends response
3. **Response Error Sync**: Matches on error output (`{ error }`), sends error response

### Aggregation Syncs

1. **AggregateReviewRating**: 
   - Triggers on `Review.createReview` success
   - Captures `storeId` and `rating` from input parameters
   - Calls `Rating.updateRating` with contribution

2. **AdjustRatingOnReviewDeletion**:
   - Triggers on `Review.deleteReview` success
   - **REQUIRES**: `deleteReview` returns `{ storeId, rating }` before deletion
   - Calls `Rating.updateRating` with negative contribution

### Cascading Deletion Syncs

1. **CascadeUserDeletion**:
   - Triggers on `User.deleteUser` success
   - Calls `Review.deleteReviewsByUser`

2. **CascadeStoreDeletion**:
   - Triggers on `Store.deleteStore` success
   - Calls `Tagging.deleteTagsForStore`, `Review.deleteReviewsForStore`, `Rating.deleteRatingForStore`

### Validation Syncs

1. **CreateReviewRequest**:
   - Validates user exists before allowing review creation
   - Uses `where` clause with `User._getUserById` query

## Implementation Checklist

### Backend Implementation

- [ ] Implement all query methods (`_get*`)
- [ ] Implement all cascading deletion methods
- [ ] Modify `deleteReview` to return review data
- [ ] Test all new methods
- [ ] Copy sync files to backend repository
- [ ] Register syncs in backend
- [ ] Configure passthrough.ts
- [ ] Test all syncs

### Frontend Verification

- [ ] Verify error handling works correctly
- [ ] Test user registration/login
- [ ] Test review creation/deletion
- [ ] Test store creation/deletion
- [ ] Test rating aggregation
- [ ] Test cascading deletions
- [ ] Verify data refresh after mutations

## Important Notes

1. **Review Deletion**: The `deleteReview` method MUST be modified to return `{ storeId, rating }` before deletion. This is critical for the `AdjustRatingOnReviewDeletion` sync to work.

2. **Query Return Types**: Query methods return data directly:
   - `_getReviewById` returns `ReviewDoc | null`
   - `_getStoresByTag` returns `Set<ID>`
   - `_getUserById` returns user data object or `null`

3. **Frame Query API**: The exact frame query API may vary based on the sync engine. The syncs are written conceptually and may need adjustment based on actual sync engine capabilities.

4. **Error Handling**: All syncs properly handle error cases by matching on `{ error }` in action outputs.

5. **Passthrough Configuration**: The passthrough configuration is critical - excluded routes go through syncs, included routes are direct pass-through. **Note**: Internal actions (like `deleteTagsForStore`, `updateRating`) are excluded to prevent direct HTTP access - they should only be called by syncs internally.

## Testing Strategy

1. **Unit Test Each Sync**:
   - Test request syncs fire correctly
   - Test response syncs format correctly
   - Test aggregation syncs update ratings
   - Test cascading deletion syncs clean up data

2. **Integration Test Flows**:
   - User registration → login → create review → delete user
   - Create store → add tag → create review → delete store
   - Create review → verify rating → delete review → verify rating adjusted

3. **Edge Cases**:
   - Create review with non-existent user (should fail)
   - Delete store with no reviews (should succeed)
   - Delete review that doesn't exist (should return error)

## Files Reference

- **Sync Specifications**: `src/syncs/*.sync.ts`
- **Concept Specifications**: `concept-spec.md`
- **Backend Method Implementations**: `BACKEND_METHOD_IMPLEMENTATIONS.md`
- **Passthrough Configuration**: `passthrough.ts.example`
- **Implementation Checklist**: `BACKEND_IMPLEMENTATION_CHECKLIST.md`

All syncs are ready for backend implementation and have been adjusted to match the backend concept patterns.


