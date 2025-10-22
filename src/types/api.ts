// API Response Types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
}

// Store Types
export interface Store {
  storeId: string
  name: string
  address: string
}

export interface CreateStoreRequest {
  name: string
  address: string
}

export interface CreateStoreResponse {
  storeId: string
}

export interface GetStoreResponse {
  name: string
  address: string
}

export interface GetStoresByNameRequest {
  name: string
}

export interface GetStoresByAddressRequest {
  address: string
}

export interface StoreIdResponse {
  storeId: string
}

// User Types
export interface User {
  userId: string
  username: string
  email: string
  creationDate: string
}

export interface RegisterUserRequest {
  username: string
  email: string
  password: string
}

export interface AuthenticateUserRequest {
  usernameOrEmail: string
  password: string
}

export interface UserResponse {
  userId: string
}

export interface UpdateUserEmailRequest {
  userId: string
  newEmail: string
}

// Review Types
export interface Review {
  reviewId: string
  userId: string
  storeId: string
  text: string
  rating: number
}

export interface CreateReviewRequest {
  userId: string
  storeId: string
  text: string
  rating: number
}

export interface CreateReviewResponse {
  reviewId: string
}

export interface GetReviewsForStoreRequest {
  storeId: string
}

export interface GetReviewsByUserRequest {
  userId: string
}

export interface ReviewsResponse {
  reviewIds: string[]
}

// Rating Types
export interface Rating {
  aggregatedRating: number
  reviewCount: number
}

export interface UpdateRatingRequest {
  storeId: string
  contribution: {
    rating: number
    weight: number
  }
}

export interface GetRatingRequest {
  storeId: string
}

// Tagging Types
export interface AddTagRequest {
  storeId: string
  tag: string
}

export interface RemoveTagRequest {
  storeId: string
  tag: string
}

export interface GetStoresByTagRequest {
  tag: string
}
