# Sync Engine Requirements and Considerations

## Critical Issue: Review Deletion Timing

### Problem

The `AdjustRatingOnReviewDeletion` sync needs the review's `storeId` and `rating` to adjust the aggregated rating. However, once `Review.deleteReview` is called, the review no longer exists, so we can't query it afterward.

### Solution Options

#### Option 1: Query Before Deletion (Recommended if supported)

If the sync engine supports executing `where` clauses **before** the action in the `when` clause, we can query the review before deletion:

```typescript
export const AdjustRatingOnReviewDeletion: Sync = ({ reviewId, storeId, rating }) => ({
    when: actions([
        Review.deleteReview,
        { reviewId },
        {}, // Success output
    ]),
    where: async (frames) => {
        // CRITICAL: Query the review BEFORE deletion
        // The sync engine must execute this BEFORE the deleteReview action
        const review = await frames.query(Review._getReviewById, { reviewId }, {});
        if (!review) return frames; // Review doesn't exist
        return frames.bind({ storeId: review.storeId, rating: review.rating });
    },
    then: actions([
        Rating.updateRating,
        { storeId, contribution: { rating: -rating, weight: -1 } },
    ]),
});
```

**Requirement**: Sync engine must execute `where` clause **before** executing the action in `when`.

#### Option 2: Two-Step Sync Pattern

If the sync engine doesn't support querying before deletion, use two syncs:

1. **Sync 1**: Query review when deletion is requested, store data temporarily
2. **Sync 2**: After deletion, use stored data to adjust rating

This requires a temporary storage mechanism (not ideal).

#### Option 3: Modify deleteReview to Return Review Data

Modify the backend `deleteReview` method to return the review data before deletion:

```typescript
async deleteReview({ reviewId }: { reviewId: ID }): Promise<{ storeId: Store, rating: number } | { error: string }> {
  try {
    // First, get the review data
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    if (!review) {
      return { error: `Review with ID '${reviewId}' not found.` };
    }
    
    // Store the data we need
    const { storeId, rating } = review;
    
    // Then delete the review
    await this.reviewsCollection.deleteOne({ _id: reviewId });
    
    // Return the data needed for syncs
    return { storeId, rating };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { error: `Internal server error: ${message}` };
  }
}
```

Then the sync becomes:

```typescript
export const AdjustRatingOnReviewDeletion: Sync = ({ reviewId, storeId, rating }) => ({
    when: actions([
        Review.deleteReview,
        { reviewId },
        { storeId, rating }, // Review data returned from deleteReview
    ]),
    then: actions([
        Rating.updateRating,
        { storeId, contribution: { rating: -rating, weight: -1 } },
    ]),
});
```

**Recommendation**: Use Option 3 if the sync engine doesn't support Option 1. This is the most straightforward and reliable approach.

## Sync Engine Capabilities Needed

### 1. Action Return Type Matching

The sync engine must support matching on action outputs:
- Success: `{ reviewId }`, `{ userId }`, `{ storeId }`, etc.
- Error: `{ error: string }`

### 2. Input Parameter Access

The sync engine must allow access to input parameters in aggregation syncs:
- `AggregateReviewRating` needs `storeId` and `rating` from input
- These are not in the output, so we need input access

### 3. Query Execution in `where` Clauses

The sync engine must support:
- Querying other concepts in `where` clauses
- Returning `null` or empty frames if query fails
- Binding query results to frame variables

### 4. Frame Binding

The sync engine must support:
- Binding variables to frames: `frames.bind({ storeId, rating })`
- Accessing bound variables in `then` clauses
- Passing bound variables between syncs

### 5. Action Execution Order

For `AdjustRatingOnReviewDeletion`:
- If Option 1: Execute `where` clause BEFORE action
- If Option 3: No special ordering needed (data in output)

## Updated Sync Specifications

Based on the backend implementation pattern, I've updated all syncs to:

1. **Match return types correctly**:
   - Success: `{ reviewId }`, `{ userId }`, `{ storeId }`
   - Error: `{ error: string }`
   - Empty: `{}` for successful deletions

2. **Handle input parameters**:
   - `AggregateReviewRating` captures `storeId` and `rating` from input
   - These are available in the action input parameters

3. **Document timing issues**:
   - `AdjustRatingOnReviewDeletion` has a timing issue that needs resolution
   - Recommend Option 3 (modify `deleteReview` to return data)

## Backend Method Requirements

### Review Concept - Modified Method

```typescript
/**
 * deleteReview(reviewId: String): { storeId: String, rating: Number } | { error: String }
 *
 * REQUIRED MODIFICATION: Return review data before deletion for sync use
 *
 * requires:
 *   The `reviewId` must exist.
 * effects:
 *   Deletes the specified `Review` record.
 *   Returns the storeId and rating before deletion (for sync use).
 * returns:
 *   { storeId, rating } on success (data returned before deletion)
 *   { error } if the review does not exist or an error occurs
 */
async deleteReview({ reviewId }: { reviewId: ID }): Promise<{ storeId: Store, rating: number } | { error: string }> {
  try {
    // First, get the review data (needed for syncs)
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    if (!review) {
      return { error: `Review with ID '${reviewId}' not found.` };
    }
    
    // Store the data we need for syncs
    const { storeId, rating } = review;
    
    // Then delete the review
    const result = await this.reviewsCollection.deleteOne({ _id: reviewId });
    
    if (result.deletedCount === 1) {
      // Return the data needed for AdjustRatingOnReviewDeletion sync
      return { storeId, rating };
    } else {
      // This shouldn't happen since we checked above, but handle it
      return { error: `Review with ID '${reviewId}' not found.` };
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting review: ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

### Alternative: Keep Original deleteReview, Use Query in Sync

If you prefer not to modify `deleteReview`, the sync engine must support querying BEFORE the action executes. This requires:

1. Sync engine executes `where` clause before action
2. Query results are available in `then` clause
3. Action still executes normally

This is more complex and depends on sync engine capabilities.

## Recommendation

**Use Option 3**: Modify `deleteReview` to return review data. This is:
- ✅ Simplest to implement
- ✅ Most reliable (no timing issues)
- ✅ Doesn't depend on sync engine capabilities
- ✅ Clear and explicit

The modified `deleteReview` method returns the data needed for the sync, making the sync straightforward and reliable.


