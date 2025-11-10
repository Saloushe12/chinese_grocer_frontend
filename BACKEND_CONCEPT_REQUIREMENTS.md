# Backend Concept Requirements

## Analysis of Backend Concept Implementation

Based on the example `ReviewConcept` class, here are the key patterns and requirements:

### Return Type Patterns

1. **Actions (create, delete, update)**:
   - Success: `{ reviewId: ID }` or `{}` (empty object)
   - Error: `{ error: string }`
   - Never throws exceptions; errors are returned as objects

2. **Queries (get, list)**:
   - Success: `{ reviewIds: Set<ID> }` or similar structured return
   - Error: Returns empty/default values (e.g., `{ reviewIds: new Set<ID>() }`)

### Required Methods for Syncs

#### Review Concept - Missing Methods Needed

1. **`deleteReviewsForStore(storeId: Store): Promise<Empty | { error: string }>`**
   - **Purpose**: Cascading deletion when a store is deleted
   - **Used by**: `CascadeStoreDeletion` sync
   - **Implementation**: Delete all reviews where `storeId` matches

2. **`deleteReviewsByUser(userId: User): Promise<Empty | { error: string }>`**
   - **Purpose**: Cascading deletion when a user is deleted
   - **Used by**: `CascadeUserDeletion` sync
   - **Implementation**: Delete all reviews where `userId` matches

3. **`_getReviewById(reviewId: ID): Promise<ReviewDoc | null>`**
   - **Purpose**: Query to get review details (for sync `where` clauses)
   - **Used by**: `AdjustRatingOnReviewDeletion` sync
   - **Implementation**: Find review by `_id`, return full document or null

4. **`_getReviewsForStore(storeId: Store): Promise<Set<ID>>`**
   - **Purpose**: Query version for sync `where` clauses
   - **Used by**: Sync queries that need review IDs
   - **Implementation**: Similar to `getReviewsForStore` but returns `Set<ID>` directly

5. **`_getReviewsByUser(userId: User): Promise<Set<ID>>`**
   - **Purpose**: Query version for sync `where` clauses
   - **Used by**: Sync queries that need review IDs
   - **Implementation**: Similar to `getReviewsByUser` but returns `Set<ID>` directly

### Similar Patterns Needed for Other Concepts

#### User Concept - Missing Methods

1. **`_getUserById(userId: ID): Promise<{ username: string, email: string, creationDate: Date } | null>`**
   - **Purpose**: Query for sync validation
   - **Used by**: `CreateReviewRequest` sync
   - **Implementation**: Find user by `_id`, return non-sensitive data or null

#### Store Concept - Missing Methods

1. **`_getStore(storeId: ID): Promise<{ name: string, address: string } | null>`**
   - **Purpose**: Query for sync queries
   - **Used by**: `GetStoresByTagResponse` sync
   - **Implementation**: Find store by `_id`, return name and address or null

#### Rating Concept - Missing Methods

1. **`deleteRatingForStore(storeId: Store): Promise<Empty | { error: string }>`**
   - **Purpose**: Cascading deletion when a store is deleted
   - **Used by**: `CascadeStoreDeletion` sync
   - **Implementation**: Delete rating record where `storeId` matches

2. **`_getRating(storeId: Store): Promise<{ aggregatedRating: number, reviewCount: number } | null>`**
   - **Purpose**: Query for sync queries
   - **Used by**: `GetStoresByTagResponse` sync
   - **Implementation**: Find rating by `storeId`, return rating data or null

#### Tagging Concept - Missing Methods

1. **`deleteTagsForStore(storeId: Store): Promise<Empty | { error: string }>`**
   - **Purpose**: Cascading deletion when a store is deleted
   - **Used by**: `CascadeStoreDeletion` sync
   - **Implementation**: Delete all tagging records where `storeId` matches

2. **`_getStoresByTag(tag: string): Promise<Set<ID>>`**
   - **Purpose**: Query for sync queries
   - **Used by**: `GetStoresByTagRequest` and `GetStoresByTagResponse` syncs
   - **Implementation**: Find all stores with the given tag, return Set<ID>


## Implementation Guide

### Pattern for Cascading Deletion Methods

```typescript
async deleteReviewsForStore({ storeId }: { storeId: Store }): Promise<Empty | { error: string }> {
  try {
    const result = await this.reviewsCollection.deleteMany({ storeId: storeId });
    // Even if no documents were deleted, it's still considered success
    // (the store may not have had any reviews)
    return {};
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting reviews for store '${storeId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

### Pattern for Query Methods (for sync `where` clauses)

```typescript
async _getReviewById({ reviewId }: { reviewId: ID }): Promise<ReviewDoc | null> {
  try {
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    return review || null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting review '${reviewId}': ${message}`);
    return null; // Return null on error for queries
  }
}
```

### Pattern for Query Methods (returning Set<ID>)

```typescript
async _getReviewsForStore({ storeId }: { storeId: Store }): Promise<Set<ID>> {
  try {
    const reviews = await this.reviewsCollection.find(
      { storeId: storeId },
      { projection: { _id: 1 } }
    ).toArray();
    return new Set<ID>(reviews.map((r) => r._id));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting reviews for store '${storeId}': ${message}`);
    return new Set<ID>(); // Return empty set on error
  }
}
```

## Sync Adjustments Needed

### 1. Error Handling in Syncs

Syncs need to check for `{ error }` in return values:

```typescript
// Instead of assuming success, check for error
const result = await Review.createReview({ userId, storeId, text, rating });
if ('error' in result) {
  // Handle error
  return { error: result.error };
}
// Use result.reviewId
```

### 2. Query Return Types

Sync `where` clauses need to handle query return types correctly:

```typescript
// Query methods return the data directly or null
const review = await frames.query(Review._getReviewById, { reviewId }, {});
if (!review) {
  // Review doesn't exist
  return frames; // Empty frames, sync won't fire
}
// Use review.storeId, review.rating
```

### 3. Set Return Types

When queries return `Set<ID>`, syncs need to handle them:

```typescript
// Query returns Set<ID> directly
const reviewIds = await frames.query(Review._getReviewsForStore, { storeId }, {});
// reviewIds is a Set<ID>
```

## Summary

The backend concept implementation uses:
- **Return objects** for errors (`{ error: string }`) instead of throwing
- **Structured returns** for queries (`{ reviewIds: Set<ID> }`)
- **Query methods** (prefixed with `_`) that return data directly or null

Syncs need to:
- **Check for errors** in action return values
- **Handle null returns** from query methods
- **Use Set<ID>** returns from query methods correctly

Additional methods needed:
- Cascading deletion methods (`deleteReviewsForStore`, `deleteReviewsByUser`, etc.)
- Query methods for sync `where` clauses (`_getReviewById`, etc.)
- Query methods returning `Set<ID>` for sync queries


