# Sync Implementation Summary

## Overview

This document summarizes the synchronization (sync) specifications that have been created for the backend implementation. These syncs define how concepts interact with each other and how HTTP requests are handled through the `Requesting` concept.

## Files Created

### 1. Concept Specifications
- **`concept-spec.md`**: Updated concept specifications with new actions needed for syncs:
  - Added query methods (prefixed with `_`) for sync `where` clauses
  - Added cascading deletion actions (e.g., `deleteReviewsByUser`, `deleteTagsForStore`)
  - Updated action descriptions to note sync dependencies

### 2. Sync Specification Files
All sync files are in `src/syncs/`:

- **`user_auth.sync.ts`**: User registration, authentication, and cascading user deletion
- **`stores.sync.ts`**: Store creation and cascading store deletion
- **`reviews.sync.ts`**: Review creation, rating aggregation, and review deletion handling
- **`tagging.sync.ts`**: Tag management and query orchestration

### 3. Documentation
- **`src/syncs/README.md`**: Comprehensive guide to the sync system

## Key Sync Patterns Implemented

### 1. Request-Response Flows
Each action that should be handled by syncs has three syncs:
- `*Request`: Translates HTTP request to concept action
- `*ResponseSuccess`: Handles successful responses
- `*ResponseError`: Handles error responses

**Example**: `UserRegistrationRequest`, `UserRegistrationResponseSuccess`, `UserRegistrationResponseError`

### 2. Cascading Deletions
Maintains data integrity when entities are deleted:
- `CascadeUserDeletion`: Deletes user's reviews
- `CascadeStoreDeletion`: Deletes store's tags, reviews, and ratings

### 3. Pre-condition Validation
Uses `where` clauses to validate data before actions execute:
- `CreateReviewRequest`: Validates user exists before allowing review creation

### 4. Aggregation Syncs
Maintains derived data when source data changes:
- `AggregateReviewRating`: Updates rating aggregate when review is created
- `AdjustRatingOnReviewDeletion`: Adjusts rating aggregate when review is deleted

### 5. Query Orchestration
Combines data from multiple concepts:
- `GetStoresByTagRequest` & `GetStoresByTagResponse`: Gets stores by tag with ratings and details

## Actions to Exclude in Backend

These actions should be marked as "excluded" in the backend configuration (turned into `Requesting.request` actions):

1. `/User/registerUser` → Handled by `UserRegistrationRequest`
2. `/User/authenticateUser` → Handled by `UserAuthenticationRequest`
3. `/Review/createReview` → Handled by `CreateReviewRequest` (with user validation)
4. `/Store/createStore` → Handled by `CreateStoreRequest`
5. `/Tagging/addTag` → Handled by `AddTagRequest`

## Actions to Include in Backend

These actions should remain "included" (direct pass-through):
- All query actions (prefixed with `_`)
- Most read operations that don't require special handling
- Actions that are only called by other syncs (not directly from HTTP)

## New Actions Added to Concepts

### User Concept
- `_getUserById`: Query method for sync validation

### Store Concept
- `_getStore`: Query method for sync queries

### Tagging Concept
- `deleteTagsForStore`: Cascading deletion action
- `_getStoresByTag`: Query method for sync queries

### Review Concept
- `deleteReviewsForStore`: Cascading deletion action
- `deleteReviewsByUser`: Cascading deletion action
- `_getReviewById`: Query method for sync queries
- `_getReviewsForStore`: Query method for sync queries
- `_getReviewsByUser`: Query method for sync queries

### Rating Concept
- `deleteRatingForStore`: Cascading deletion action
- `_getRating`: Query method for sync queries

## Next Steps

### Backend Implementation
1. Copy sync files from `src/syncs/` to your backend repository
2. Update concept implementations to include new actions:
   - Query methods (prefixed with `_`)
   - Cascading deletion methods
3. Configure action inclusion/exclusion in backend
4. Register syncs in backend sync registration
5. Test each sync individually
6. Verify cascading deletions work correctly

### Frontend Updates
The frontend API client should continue to work as-is since the HTTP endpoints remain the same. However, you may want to:
1. Test that all endpoints still work correctly
2. Verify error handling works with new sync-based error responses
3. Update any direct concept action calls to use the Requesting concept paths

### Testing Checklist
- [ ] User registration flow
- [ ] User authentication flow
- [ ] Store creation flow
- [ ] Review creation (with user validation)
- [ ] Review deletion (rating adjustment)
- [ ] Store deletion (cascading to tags, reviews, ratings)
- [ ] User deletion (cascading to reviews)
- [ ] Tag addition
- [ ] Query orchestration (stores by tag)

## Rationale

Moving syncs to the backend provides:
- **Security**: Sync logic cannot be bypassed by frontend modifications
- **Consistency**: All sync logic is centralized and organized
- **Maintainability**: Clear separation between concept logic and orchestration
- **Reliability**: Syncs are guaranteed to execute in the correct order

## Notes

- All sync files include `@ts-nocheck` because they're specifications that reference backend-only modules
- The sync syntax follows the pattern from the assignment instructions
- Query methods use the `_` prefix to distinguish them from actions
- Cascading deletion actions are typically only invoked by syncs, not directly from HTTP

## References

- Assignment instructions: Concept Design with Synchronizations
- Concept specifications: `concept-spec.md`
- Sync documentation: `src/syncs/README.md`

