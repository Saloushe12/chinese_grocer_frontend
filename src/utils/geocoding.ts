/**
 * Geocoding utilities using OpenStreetMap Nominatim API (free, no API key required)
 * Documentation: https://nominatim.org/release-docs/develop/api/Overview/
 */

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface GeocodeResult {
  coordinates: Coordinates
  displayName: string
  address?: {
    city?: string
    state?: string
    country?: string
  }
}

/**
 * Geocode an address to coordinates using OpenStreetMap Nominatim
 * Free, no API key required. Rate limit: 1 request per second
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    // Use Nominatim API (free, open-source)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChineseGroceryFinder/1.0', // Nominatim requires a User-Agent
        'Accept-Language': 'en'
      }
    })
    
    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      return null
    }
    
    const result = data[0]
    return {
      coordinates: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      },
      displayName: result.display_name,
      address: {
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state,
        country: result.address?.country
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to an address using OpenStreetMap Nominatim
 */
export async function reverseGeocode(coordinates: Coordinates): Promise<GeocodeResult | null> {
  try {
    const { latitude, longitude } = coordinates
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChineseGroceryFinder/1.0',
        'Accept-Language': 'en'
      }
    })
    
    if (!response.ok) {
      throw new Error('Reverse geocoding request failed')
    }
    
    const data = await response.json()
    
    if (!data || !data.lat || !data.lon) {
      return null
    }
    
    return {
      coordinates: {
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon)
      },
      displayName: data.display_name,
      address: {
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country
      }
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude)
  const dLon = toRadians(coord2.longitude - coord1.longitude)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Geocode a store address and add coordinates to the store object
 */
export interface StoreWithCoordinates {
  storeId: string
  name: string
  address: string
  coordinates?: Coordinates
  distance?: number // Distance from user location in km
}

/**
 * Geocode store addresses in batch with rate limiting
 * Nominatim allows 1 request per second, so we'll add delays
 */
export async function geocodeStores(stores: Array<{ storeId: string; name: string; address: string }>): Promise<StoreWithCoordinates[]> {
  const storesWithCoords: StoreWithCoordinates[] = []
  
  for (let i = 0; i < stores.length; i++) {
    const store = stores[i]
    
    if (!store || !store.storeId || !store.name || !store.address) {
      continue // Skip invalid stores
    }
    
    // Rate limit: wait 1 second between requests (Nominatim requirement)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1100)) // 1.1 seconds to be safe
    }
    
    const geocodeResult = await geocodeAddress(store.address)
    
    storesWithCoords.push({
      storeId: store.storeId,
      name: store.name,
      address: store.address,
      coordinates: geocodeResult?.coordinates
    })
  }
  
  return storesWithCoords
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  }
  return `${distanceKm.toFixed(1)}km`
}

