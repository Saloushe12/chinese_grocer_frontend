# Concept Specifications

## Concept: User

**purpose**
To manage user accounts, including registration, authentication, and basic profile information.

**principle**
User accounts are fundamental for personalized interactions like leaving reviews or setting language preferences. Other concepts interact with `User` primarily to identify who is performing an action or whose preferences are being queried.

**state**
Each `User` is represented by:

* `userId`: String (unique document identifier)
* `username`: String (unique identifier for login)
* `email`: String (unique identifier for login and communication)
* `passwordHash`: String (hashed password for security)
* `creationDate`: Timestamp

**actions**

* `registerUser(username: String, email: String, password: String): userId`
  * **Requires:** The `username` and `email` must not already exist in the system. The `password` should meet security criteria (e.g., complexity, length).
  * **Effect:** Creates a new user account, hashes the password, and returns the unique `userId`.
* `authenticateUser(usernameOrEmail: String, password: String): userId`
  * **Requires:** A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.
  * **Effect:** Authenticates the user and returns their `userId`. Returns an `error` if authentication fails.
* `getUserById(userId: String): { username: String, email: String, creationDate: Timestamp }`
  * **Requires:** The `userId` must exist.
  * **Effect:** Returns basic non-sensitive user profile information.
* `updateUserEmail(userId: String, newEmail: String)`
  * **Requires:** The `userId` must exist. The `newEmail` must not already be in use by another user.
  * **Effect:** Updates the user's email address.
* `deleteUser(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Deletes the user account. Associated data in other concepts (reviews) is removed by synchronizations.

**queries**
* `_getUserById(userId: String): { username: String, email: String, creationDate: Timestamp }`
  * **Requires:** The `userId` must exist.
  * **Effect:** Returns the user's username, email, and creation date.

---

## Concept: Store

**purpose**
Represent the identity and physical address of a store.

**principle**
A store's existence and location are fundamental. Interactions related to its classification, user feedback, or popularity are external concerns managed by other concepts through synchronizations.

**state**
Each `Store` is represented by:

* `storeId`: String (unique document identifier)
* `name`: String
* `address`: String // A string representation is sufficient for basic identification.

**actions**

* `createStore(name: String, address: String): storeId`
  * **Requires:** No existing store has both the exact same `name` and `address`.
  * **Effect:** Creates a new store record and returns its unique `storeId`.
* `deleteStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes the store record. Cascading deletion of associated data (tags, reviews, ratings) is handled by synchronizations.
* `getStore(storeId: String): (name: String, address: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the `name` and `address` of the specified store.
* `getStoresByName(name: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s matching the given `name`.
* `getStoresByAddress(address: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s matching the given `address`.

**queries**
* `_getStore(storeId: String): { name: String, address: String }`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the name and address of the specified store.

---

## Concept: Tagging

**purpose**
To allow arbitrary classification of stores using descriptive tags.

**state**
Each `Tagging` record associates tags with a store:

* `storeId`: String (references a `Store`)
* `tags`: Set<String> (a collection of user-defined tags)

**actions**

* `addTag(storeId: String, tag: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
* `removeTag(storeId: String, tag: String)`
  * **Requires:** The `storeId` must exist. The `tag` must be present in the store's tag set.
  * **Effect:** Removes the specified `tag` from the `storeId`'s set of tags.
* `getStoresByTag(tag: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s that are currently associated with the given `tag`.
* `deleteTagsForStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes all `Tagging` records associated with the specified `storeId`. This action is typically invoked by a synchronization.

**queries**
* `_getStoresByTag(tag: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s that are currently associated with the given `tag`.

---

## Concept: Review

**purpose**
To capture textual reviews and individual ratings submitted by users for specific stores. This concept is solely responsible for the *individual* review data.

**state**
Each `Review` record:

* `reviewId`: String (unique document identifier)
* `storeId`: String (references a `Store`)
* `userId`: String (references a `User`)
* `text`: String (the content of the review)
* `rating`: Number (a specific numeric rating for this review, e.g., 1-5)

**actions**

* `createReview(userId: String, storeId: String, text: String, rating: Number): reviewId`
  * **Requires:** The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).
  * **Effect:** Creates a new `Review` record and returns its unique `reviewId`. The aggregate rating for the store is updated by a synchronization.
* `deleteReview(reviewId: String)`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Deletes the specified `Review` record. The aggregate rating for the store is adjusted by a synchronization.
* `getReviewsForStore(storeId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s associated with the specified `storeId`.
* `getReviewsByUser(userId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s created by the specified `userId`.
* `deleteReviewsForStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes all `Review` records associated with the specified `storeId`. This action is typically invoked by a synchronization.
* `deleteReviewsByUser(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Removes all `Review` records created by the specified `userId`. This action is typically invoked by a synchronization.

**queries**
* `_getReviewById(reviewId: String): { reviewId: String, storeId: String, userId: String, text: String, rating: Number }`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Returns the full details of the specified review.
* `_getReviewsForStore(storeId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s associated with the specified `storeId`. (Added for consistency with `_getReviewById` and for `where` clauses)
* `_getReviewsByUser(userId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s created by the specified `userId`. (Added for consistency with `_getReviewById` and for `where` clauses)

---

## Concept: Rating

**purpose**
To maintain an aggregated rating score and count for a store, derived from individual reviews.

**state**
Each `Rating` record:

* `storeId`: String (references a `Store`)
* `aggregatedRating`: Number // Represents the calculated average or composite rating.
* `reviewCount`: Number // The total number of reviews contributing to the aggregated rating.

**actions**

* `updateRating(storeId: String, contribution: { rating: Number, weight: Number })`
  * **Requires:** The `storeId` must exist. The `contribution` object contains the `rating` of a new or updated review and its `weight`.
  * **Effect:** Updates the `aggregatedRating` and increments/decrements the `reviewCount` for the `storeId` based on the provided `contribution`. This action is intended to be invoked by a synchronization mechanism.
* `getRating(storeId: String): { aggregatedRating: Number, reviewCount: Number }`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the current aggregated rating and the count of reviews for the store.
* `deleteRatingForStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes the `Rating` record for the specified `storeId`. This action is typically invoked by a synchronization.

**queries**
* `_getRating(storeId: String): { aggregatedRating: Number, reviewCount: Number }`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the current aggregated rating and the count of reviews for the store.

---

## Synchronizations

All synchronizations are documented in the `src/syncs/` directory. These syncs handle:

1. **Request-Response Flows**: Translating HTTP requests from the `Requesting` concept into concept actions and vice versa
2. **Cascading Deletions**: Ensuring data integrity when entities are deleted
3. **Aggregation**: Maintaining derived data (e.g., aggregated ratings from individual reviews)
4. **Pre-condition Validation**: Ensuring data integrity before actions are executed
5. **Query Orchestration**: Combining data from multiple concepts for complex queries

See individual sync files for detailed specifications:
- `src/syncs/user_auth.sync.ts` - User authentication and registration syncs
- `src/syncs/stores.sync.ts` - Store management syncs
- `src/syncs/reviews.sync.ts` - Review management and rating aggregation syncs
- `src/syncs/tagging.sync.ts` - Tagging and query orchestration syncs

