# API Specification: Store Concept

**Purpose:** Represent the identity and physical address of a store.

***

## API Endpoints

### POST /api/Store/createStore

**Description:** Creates a new store record and returns its unique `storeId`.

**Requirements:**

*   No existing store has both the exact same `name` and `address`.

**Effects:**

*   Creates a new store record and returns its unique `storeId`.

**Request Body:**

```json
{
  "name": "string",
  "address": "string"
}
```

**Success Response Body (Action):**

```json
{
  "storeId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: Minimal Additions for Frontend Integration

The following endpoints augment the existing API so the current frontend can render real data without fabricating it. They do not replace existing endpoints; they are additive.

## Store Additions

### POST /api/Store/listStores

Description: Returns a list of stores. This endpoint exposes only fields intrinsic to the Store concept (no ratings, review counts, or tags).

Requirements:
- (None explicitly stated)

Effects:
- Returns an array of full store summaries.

Request Body:

```json
{}
```

Success Response Body (Query):

```json
{
  "items": [
    {
      "storeId": "string",
      "name": "string",
      "address": "string",
      "description": "string",
      "phone": "string",
      "hours": "string",
      "specialties": ["string"],
      "image": "string"
    }
  ]
}
```

Error Response Body:

```json
{
  "error": "string"
}
```

***

### POST /api/Store/getStoreById

Description: Returns a single store. This endpoint exposes only fields intrinsic to the Store concept (no ratings, review counts, or tags).

Requirements:
- The `storeId` must exist.

Effects:
- Returns the full store object.

Request Body:

```json
{
  "storeId": "string"
}
```

Success Response Body (Query):

```json
{
  "storeId": "string",
  "name": "string",
  "address": "string",
  "description": "string",
  "phone": "string",
  "hours": "string",
  "specialties": ["string"],
  "image": "string"
}
```

Error Response Body:

```json
{
  "error": "string"
}
```

## Review Additions

### POST /api/Review/listReviewsForStore

Description: Returns full review objects for a given `storeId`.

Requirements:
- (None explicitly stated)

Effects:
- Returns an array of review objects. This concept remains isolated from Store; it does not alter Store data.

Request Body:

```json
{
  "storeId": "string"
}
```

Success Response Body (Query):

```json
{
  "items": [
    {
      "reviewId": "string",
      "userId": "string",
      "storeId": "string",
      "text": "string",
      "rating": "number",
      "tags": ["string"],
      "createdAt": "string"
    }
  ]
}
```

Error Response Body:

```json
{
  "error": "string"
}
```

***

### POST /api/Review/listReviewsByUser

Description: Returns full review objects authored by a given `userId`.

Requirements:
- (None explicitly stated)

Effects:
- Returns an array of review objects authored by the user. This concept remains isolated from Store; it does not alter Store data.

Request Body:

```json
{
  "userId": "string"
}
```

Success Response Body (Query):

```json
{
  "items": [
    {
      "reviewId": "string",
      "userId": "string",
      "storeId": "string",
      "text": "string",
      "rating": "number",
      "tags": ["string"],
      "createdAt": "string"
    }
  ]
}
```

Error Response Body:

```json
{
  "error": "string"
}
```

***

### POST /api/Store/deleteStore

**Description:** Removes the store record.

**Requirements:**

*   The `storeId` must exist.

**Effects:**

*   Removes the store record.

**Request Body:**

```json
{
  "storeId": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Store/_getStore

**Description:** Returns the `name` and `address` of the specified store.

**Requirements:**

*   The `storeId` must exist.

**Effects:**

*   Returns the `name` and `address` of the specified store.

**Request Body:**

```json
{
  "storeId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "name": "string",
    "address": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Store/_getStoresByName

**Description:** Returns a set of all `storeId`s matching the given `name`.

**Requirements:**
- (None explicitly stated)

**Effects:**

*   Returns a set of all `storeId`s matching the given `name`.

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "storeId": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Store/_getStoresByAddress

**Description:** Returns a set of all `storeId`s matching the given `address`.

**Requirements:**
- (None explicitly stated)

**Effects:**

*   Returns a set of all `storeId`s matching the given `address`.

**Request Body:**

```json
{
  "address": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "storeId": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}

# API Specification: User Concept

**Purpose:** To manage user accounts, including registration, authentication, and basic profile information.

---

## API Endpoints

### POST /api/User/registerUser

**Description:** Creates a new user account, hashes the password, and returns the unique `userId`.

**Requirements:**
- The `username` and `email` must not already exist in the system. The `password` should meet security criteria (e.g., complexity, length), though specific validation logic resides here.

**Effects:**
- Creates a new user account, hashes the password, and returns the unique `userId`.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "userId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/User/authenticateUser

**Description:** Authenticates the user and returns their `userId`.

**Requirements:**
- A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.

**Effects:**
- Authenticates the user and returns their `userId`. Returns an error if authentication fails.

**Request Body:**
```json
{
  "usernameOrEmail": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "userId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/User/getUserById

**Description:** Returns basic non-sensitive user profile information.

**Requirements:**
- The `userId` must exist.

**Effects:**
- Returns basic non-sensitive user profile information. Returns an error if the user is not found.

**Request Body:**
```json
{
  "userId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "username": "string",
  "email": "string",
  "creationDate": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/User/updateUserEmail

**Description:** Updates the user's email address.

**Requirements:**
- The `userId` must exist. The `newEmail` must not already be in use by another user.

**Effects:**
- Updates the user's email address. Returns an error if requirements are not met.

**Request Body:**
```json
{
  "userId": "string",
  "newEmail": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/User/deleteUser

**Description:** Deletes the user account.

**Requirements:**
- The `userId` must exist.

**Effects:**
- Deletes the user account. This action should ideally trigger cascades via syncs to clean up associated data in other concepts.

**Request Body:**
```json
{
  "userId": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}

# API Specification: Tagging Concept

**Purpose:** To manage the association of tags with stores.

***

## API Endpoints

### POST /api/Tagging/addTag

**Description:** Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.

**Requirements:**

* The `storeId` must exist (conceptually, in the `Store` concept).
* The `tag` should ideally be validated for format/content by a higher-level mechanism or a dedicated `Tag` concept if complexity arises. For now, it's a string.

**Effects:**

* Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
* If no `Tagging` record exists for the `storeId`, a new one is created.

**Request Body:**

```json
{
  "storeId": "string",
  "tag": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Tagging/removeTag

**Description:** Removes the specified `tag` from the `storeId`'s set of tags.

**Requirements:**

* The `storeId` must exist (i.e., there is a tagging record for it).
* The `tag` must be present in the store's tag set.

**Effects:**

* Removes the specified `tag` from the `storeId`'s set of tags.

**Request Body:**

```json
{
  "storeId": "string",
  "tag": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Tagging/\_getStoresByTag

**Description:** Returns a set of all `storeId`s that are currently associated with the given `tag`.

**Requirements:**

* (None explicitly stated)

**Effects:**

* Returns a set of all `storeId`s that are currently associated with the given `tag`.

**Request Body:**

```json
{
  "tag": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "storeId": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Tagging/listTagsForStore

**Description:** Returns the set of tags currently associated with the specified `storeId`.

**Requirements:**

* (None explicitly stated)

**Effects:**

* Returns the set of tags for the store. Tagging remains isolated from Store; this does not modify Store data.

**Request Body:**

```json
{
  "storeId": "string"
}
```

**Success Response Body (Query):**

```json
{
  "tags": [
    "string"
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

# API Specification: Review Concept

**Purpose:** To capture textual reviews and individual ratings submitted by users for specific stores.

---

## API Endpoints

### POST /api/Review/createReview

**Description:** Creates a new `Review` record and returns its unique `reviewId`.

**Requirements:**
- The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).

**Effects:**
- Creates a new `Review` record and returns its unique `reviewId`. This action *does not* update aggregate ratings; that is handled by a `sync`.

**Request Body:**
```json
{
  "userId": "string",
  "storeId": "string",
  "text": "string",
  "rating": "number"
}
```

**Success Response Body (Action):**
```json
{
  "reviewId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Review/deleteReview

**Description:** Deletes the specified `Review` record.

**Requirements:**
- The `reviewId` must exist.

**Effects:**
- Deletes the specified `Review` record.

**Request Body:**
```json
{
  "reviewId": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Review/getReviewsForStore

**Description:** Returns a set of all `reviewId`s associated with the specified `storeId`.

**Requirements:**
- (None explicitly stated)

**Effects:**
- Returns a set of all `reviewId`s associated with the specified `storeId`.

**Request Body:**
```json
{
  "storeId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "reviewIds": [
    "string"
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Review/getReviewsByUser

**Description:** Returns a set of all `reviewId`s created by the specified `userId`.

**Requirements:**
- (None explicitly stated)

**Effects:**
- Returns a set of all `reviewId`s created by the specified `userId`.

**Request Body:**
```json
{
  "userId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "reviewIds": [
    "string"
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}

# API Specification: Rating Concept

**Purpose:** To maintain an aggregated rating score and count for a store, derived from individual reviews.

---

## API Endpoints

### POST /api/Rating/updateRating

**Description:** Updates the `aggregatedRating` and increments/decrements the `reviewCount` for the `storeId` based on the provided `contribution`. If no rating record exists for the `storeId`, it is initialized with the contribution.

**Requirements:**
- The `storeId` must conceptually refer to an existing store in the system.
- The `contribution.weight` should not lead to a negative `reviewCount` for the store.

**Effects:**
- Updates the `aggregatedRating` and increments/decrements the `reviewCount` for the `storeId` based on the provided `contribution`.
- If no rating record exists for the `storeId`, it is initialized with the contribution.

**Request Body:**
```json
{
  "storeId": "string",
  "contribution": {
    "rating": "number",
    "weight": "number"
  }
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Rating/getRating

**Description:** Returns the current aggregated rating and the count of reviews for the specified store.

**Requirements:**
- The `storeId` must conceptually refer to an existing store in the system.

**Effects:**
- Returns the current aggregated rating and the count of reviews for the specified store.
- If no rating record exists for the `storeId`, returns `{ aggregatedRating: 0, reviewCount: 0 }`, indicating that the store has not yet received any reviews. This is considered a valid, non-error state, representing a store with no rating data.

**Request Body:**
```json
{
  "storeId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "aggregatedRating": "number",
  "reviewCount": "number"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}