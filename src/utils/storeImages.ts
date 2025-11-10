/**
 * Collection of representative Chinese grocery store images
 * These are free-to-use images from Unsplash that represent
 * typical Chinese grocery store interiors and exteriors
 * 
 * Images include:
 * - Store exteriors and storefronts
 * - Store interiors with aisles and shelves
 * - Produce sections with fresh vegetables
 * - Asian grocery products and packaging displays
 * - Market scenes and shopping environments
 */
export const CHINESE_GROCERY_STORE_IMAGES = [
  // Store exteriors and storefronts
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop&q=80',
  
  // Store interiors - produce sections
  'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1566385101042-1a0f0de33158?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&h=600&fit=crop&q=80',
  
  // Store aisles and shelves
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563379091339-03246963d29c?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80',
  
  // Fresh produce and vegetables
  'https://images.unsplash.com/photo-1566385101042-1a0f0de33158?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&q=80',
  
  // Market scenes and shopping environments
  'https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&h=600&fit=crop&q=80',
  
  // Store displays and product arrangements
  'https://images.unsplash.com/photo-1563379091339-03246963d29c?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&h=600&fit=crop&q=80',
]

/**
 * Get a random image from the Chinese grocery store image collection
 * @returns A URL to a representative Chinese grocery store image
 */
export function getRandomStoreImage(): string {
  const randomIndex = Math.floor(Math.random() * CHINESE_GROCERY_STORE_IMAGES.length)
  return CHINESE_GROCERY_STORE_IMAGES[randomIndex] || CHINESE_GROCERY_STORE_IMAGES[0]
}

/**
 * Get a consistent image for a store based on its storeId
 * This ensures the same store always gets the same image
 * @param storeId - The unique store identifier
 * @returns A URL to a representative Chinese grocery store image
 */
export function getStoreImageByStoreId(storeId: string): string {
  // Use storeId to deterministically select an image
  // This ensures the same store always gets the same image
  const hash = storeId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  const index = hash % CHINESE_GROCERY_STORE_IMAGES.length
  return CHINESE_GROCERY_STORE_IMAGES[Math.abs(index)] || CHINESE_GROCERY_STORE_IMAGES[0]
}

