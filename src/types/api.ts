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
  description?: string
  tags?: string[]
  phone?: string
  hours?: string
  rating?: number
  reviewCount?: number
  specialties?: string[]
  image?: string
}

export interface CreateStoreRequest {
  name: string
  address: string
  description?: string
  phone?: string
  hours?: string
  specialties?: string[]
  image?: string
}

export interface CreateStoreResponse {
  storeId: string
}

// Removed - using Store directly now

export interface GetStoresByNameRequest {
  name: string
}

export interface GetStoresByAddressRequest {
  address: string
}

// StoreListResponse and StoreDetailResponse removed - using Store[] directly now

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

export interface GetUserDetailsResponse {
  username: string
  email: string
  creationDate: string | Date
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
  tags?: string[]
}

export interface CreateReviewRequest {
  userId: string
  storeId: string
  text: string
  rating: number
  tags?: string[]
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

// ReviewsResponse and ReviewListResponse removed - using Review[] directly now

export interface ReviewWithTimestamp extends Review {
  createdAt?: string
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

export interface GetTagsForStoreRequest {
  storeId: string
}

// TagsForStoreResponse removed - using string[] directly now

export interface GetStoresByTagResponse {
  results: Store[]
  error?: string
}
