# Sync Adjustments Summary

## Changes Made Based on Backend Implementation

### 1. Return Type Adjustments

All syncs have been updated to match the backend's return type patterns:

**Actions:**
- Success: `{ reviewId: ID }`, `{ userId: ID }`, `{ storeId: ID }`
- Error: `{ error: string }`
- Deletion Success: `{}` (empty object) or `{ storeId, rating }` (for deleteReview)

**Queries:**
- Success: Returns data directly (e.g., `ReviewDoc | null`, `Set<ID>`)
- Error: Returns `null` or empty collections

### 2. Response Sync Updates

All response syncs now correctly match:
- Success cases: Match when output contains `{ reviewId }`, `{ userId }`, etc.
- Error cases: Match when output contains `{ error }`

### 3. Aggregation Sync Updates

**AggregateReviewRating:**
- Now captures `storeId` and `rating` from input parameters
- These are available in the action input, not output

**AdjustRatingOnReviewDeletion:**
- **CRITICAL CHANGE**: Requires backend modification
- `deleteReview` should return `{ storeId, rating }` before deletion
- This allows the sync to access review data that would be lost after deletion
- Alternative approaches documented in `SYNC_ENGINE_REQUIREMENTS.md`

### 4. Cascading Deletion Updates

All cascading deletion syncs now expect:
- Input actions return `{}` on success
- Cascading actions also return `{}` on success (even if no records found)

## Required Backend Modifications

### Review Concept

1. **Add `deleteReviewsForStore` method** (for CascadeStoreDeletion)
2. **Add `deleteReviewsByUser` method** (for CascadeUserDeletion)
3. **Add `_getReviewById` query method** (for sync where clauses)
4. **Add `_getReviewsForStore` query method** (for sync queries)
5. **Add `_getReviewsByUser` query method** (for sync queries)
6. **Modify `deleteReview` method** (to return `{ storeId, rating }` before deletion)

### Other Concepts

Similar methods needed for:
- User: `_getUserById`
- Store: `_getStore`, `deleteStore` (if not already exists)
- Rating: `deleteRatingForStore`, `_getRating`
- Tagging: `deleteTagsForStore`, `_getStoresByTag`

## Implementation Files Created

1. **BACKEND_CONCEPT_REQUIREMENTS.md** - Analysis of backend patterns and requirements
2. **BACKEND_METHOD_IMPLEMENTATIONS.md** - Complete method implementations for all concepts
3. **SYNC_ENGINE_REQUIREMENTS.md** - Sync engine capabilities and timing issues
4. **SYNC_ADJUSTMENTS_SUMMARY.md** - This file

## Key Decisions

### Review Deletion Timing

**Decision**: Modify `deleteReview` to return `{ storeId, rating }` before deletion.

**Rationale**:
- Simplest and most reliable solution
- Doesn't depend on sync engine capabilities
- Clear and explicit
- No timing issues

**Alternative**: If sync engine supports querying before action execution, use `where` clause (see `SYNC_ENGINE_REQUIREMENTS.md`).

## Next Steps

1. **Implement backend methods** (see `BACKEND_METHOD_IMPLEMENTATIONS.md`)
2. **Modify `deleteReview`** to return review data before deletion
3. **Test syncs** with the updated backend
4. **Verify timing** for `AdjustRatingOnReviewDeletion` sync
5. **Update passthrough.ts** (already done)

## Testing Checklist

- [ ] Test `deleteReview` returns `{ storeId, rating }` correctly
- [ ] Test `AdjustRatingOnReviewDeletion` sync fires correctly
- [ ] Test rating adjustment works correctly after deletion
- [ ] Test all cascading deletion methods return `{}` correctly
- [ ] Test all query methods return correct types
- [ ] Test error handling in all syncs


