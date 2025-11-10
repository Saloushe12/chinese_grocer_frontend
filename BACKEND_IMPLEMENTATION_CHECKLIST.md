# Backend Implementation Checklist

## Required Backend Method Implementations

Based on the backend concept pattern and sync requirements, here are all the methods that need to be implemented:

### Review Concept

#### Existing Methods (Already Implemented)
- ✅ `createReview` - Returns `{ reviewId } | { error }`
- ✅ `deleteReview` - **NEEDS MODIFICATION** (see below)
- ✅ `getReviewsForStore` - Returns `{ reviewIds: Set<ID> }`
- ✅ `getReviewsByUser` - Returns `{ reviewIds: Set<ID> }`

#### New Methods Needed
- ❌ `deleteReviewsForStore` - For `CascadeStoreDeletion` sync
- ❌ `deleteReviewsByUser` - For `CascadeUserDeletion` sync
- ❌ `_getReviewById` - Query method for sync `where` clauses
- ❌ `_getReviewsForStore` - Query method (returns `Set<ID>` directly)
- ❌ `_getReviewsByUser` - Query method (returns `Set<ID>` directly)

#### Modification Required
- ⚠️ **`deleteReview`** - Modify to return `{ storeId, rating } | { error }` instead of `{} | { error }`
  - **Reason**: Needed for `AdjustRatingOnReviewDeletion` sync
  - **Implementation**: Get review data before deletion, return it

### User Concept

#### New Methods Needed
- ❌ `_getUserById` - Query method for sync validation
  - Returns: `{ username: string, email: string, creationDate: Date } | null`
  - Used by: `CreateReviewRequest` sync

### Store Concept

#### New Methods Needed
- ❌ `_getStore` - Query method for sync queries
  - Returns: `{ name: string, address: string } | null`
  - Used by: `GetStoresByTagResponse` sync

#### Modification Required (if not already exists)
- ⚠️ `deleteStore` - Should return `{} | { error }`
  - Used by: `CascadeStoreDeletion` sync

### Rating Concept

#### New Methods Needed
- ❌ `deleteRatingForStore` - For `CascadeStoreDeletion` sync
  - Returns: `{} | { error }`
- ❌ `_getRating` - Query method for sync queries
  - Returns: `{ aggregatedRating: number, reviewCount: number } | null`
  - Used by: `GetStoresByTagResponse` sync

### Tagging Concept

#### New Methods Needed
- ❌ `deleteTagsForStore` - For `CascadeStoreDeletion` sync
  - Returns: `{} | { error }`
- ❌ `_getStoresByTag` - Query method for sync queries
  - Returns: `Set<ID>` (not wrapped in object)
  - Used by: `GetStoresByTagRequest` and `GetStoresByTagResponse` syncs


## Implementation Patterns

### Pattern 1: Cascading Deletion Method

```typescript
async deleteReviewsForStore({ storeId }: { storeId: Store }): Promise<Empty | { error: string }> {
  try {
    const result = await this.reviewsCollection.deleteMany({ storeId: storeId });
    // Return {} even if no documents were deleted (valid state)
    return {};
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting reviews for store '${storeId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

### Pattern 2: Query Method (Returns Data Directly)

```typescript
async _getReviewById({ reviewId }: { reviewId: ID }): Promise<ReviewDoc | null> {
  try {
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    return review || null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting review '${reviewId}': ${message}`);
    return null;
  }
}
```

### Pattern 3: Query Method (Returns Set<ID>)

```typescript
async _getStoresByTag({ tag }: { tag: string }): Promise<Set<ID>> {
  try {
    const taggings = await this.taggingsCollection.find(
      { tags: tag },
      { projection: { storeId: 1 } }
    ).toArray();
    return new Set<ID>(taggings.map((t) => t.storeId));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting stores by tag '${tag}': ${message}`);
    return new Set<ID>();
  }
}
```

### Pattern 4: Modified deleteReview (Returns Data Before Deletion)

```typescript
async deleteReview({ reviewId }: { reviewId: ID }): Promise<{ storeId: Store, rating: number } | { error: string }> {
  try {
    // FIRST: Get the review data (needed for syncs)
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    if (!review) {
      return { error: `Review with ID '${reviewId}' not found.` };
    }
    
    // Store the data we need for AdjustRatingOnReviewDeletion sync
    const { storeId, rating } = review;
    
    // THEN: Delete the review
    const result = await this.reviewsCollection.deleteOne({ _id: reviewId });
    
    if (result.deletedCount === 1) {
      // Return the data needed for the sync
      return { storeId, rating };
    } else {
      // This shouldn't happen, but handle it
      return { error: `Review with ID '${reviewId}' not found.` };
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting review: ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

## Testing Requirements

### Test Each New Method

1. **Cascading Deletion Methods**:
   - Test deletion when records exist
   - Test deletion when no records exist (should return `{}`)
   - Test error handling

2. **Query Methods**:
   - Test query when data exists (returns data)
   - Test query when data doesn't exist (returns `null` or empty `Set`)
   - Test error handling (returns `null` or empty `Set`)

3. **Modified deleteReview**:
   - Test deletion when review exists (returns `{ storeId, rating }`)
   - Test deletion when review doesn't exist (returns `{ error }`)
   - Test error handling

### Test Sync Integration

1. **CascadeStoreDeletion**:
   - Delete a store with reviews, tags, and ratings
   - Verify all cascading deletions occur
   - Verify no orphaned records remain

2. **CascadeUserDeletion**:
   - Delete a user with reviews
   - Verify all cascading deletions occur
   - Verify no orphaned records remain

3. **AggregateReviewRating**:
   - Create a review
   - Verify rating is updated automatically
   - Verify reviewCount is incremented

4. **AdjustRatingOnReviewDeletion**:
   - Delete a review
   - Verify rating is adjusted automatically
   - Verify reviewCount is decremented

## Implementation Order

1. **Implement query methods first** (needed by sync `where` clauses)
   - `_getUserById`
   - `_getReviewById`
   - `_getStore`
   - `_getRating`
   - `_getStoresByTag`
   - `_getReviewsForStore`
   - `_getReviewsByUser`

2. **Implement cascading deletion methods** (needed by cascade syncs)
   - `deleteReviewsForStore`
   - `deleteReviewsByUser`
   - `deleteRatingForStore`
   - `deleteTagsForStore`

3. **Modify deleteReview** (needed by `AdjustRatingOnReviewDeletion` sync)
   - Get review data before deletion
   - Return `{ storeId, rating }` on success

4. **Test all syncs** with the new methods

## Files to Update

### Backend Repository

1. **Review Concept** (`src/concepts/ReviewConcept.ts`):
   - Add new methods
   - Modify `deleteReview`

2. **User Concept** (`src/concepts/UserConcept.ts`):
   - Add `_getUserById`

3. **Store Concept** (`src/concepts/StoreConcept.ts`):
   - Add `_getStore`
   - Verify `deleteStore` exists and returns correct type

4. **Rating Concept** (`src/concepts/RatingConcept.ts`):
   - Add `deleteRatingForStore`
   - Add `_getRating`

5. **Tagging Concept** (`src/concepts/TaggingConcept.ts`):
   - Add `deleteTagsForStore`
   - Add `_getStoresByTag`


7. **Sync Files** (`src/syncs/*.sync.ts`):
   - Copy from frontend repository
   - Test with actual backend

8. **Passthrough Configuration** (`passthrough.ts`):
   - Update with correct inclusions/exclusions
   - Test route configuration

## Verification Steps

1. ✅ All new methods implemented
2. ✅ `deleteReview` modified to return review data
3. ✅ All methods return correct types
4. ✅ Error handling is consistent
5. ✅ Syncs are registered and working
6. ✅ Passthrough configuration is correct
7. ✅ All syncs fire correctly
8. ✅ Cascading deletions work
9. ✅ Aggregation syncs work
10. ✅ Frontend still works with backend


