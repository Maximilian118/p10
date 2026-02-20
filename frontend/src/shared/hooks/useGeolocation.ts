import { useCallback } from "react"

interface GeolocationResult {
  lat: number
  lng: number
  city?: string
  region?: string
  country?: string
}

// Hook for requesting browser geolocation and reverse geocoding via Nominatim.
export const useGeolocation = () => {
  // Request the user's position and reverse geocode it.
  const requestLocation = useCallback(async (): Promise<GeolocationResult | null> => {
    try {
      // Request browser geolocation.
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 600000,
        })
      })

      const { latitude: lat, longitude: lng } = position.coords

      // Reverse geocode using OpenStreetMap Nominatim (free, no API key).
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
          { headers: { "Accept-Language": "en" } },
        )
        const data = await res.json()
        const address = data.address || {}

        return {
          lat,
          lng,
          city: address.city || address.town || address.village || undefined,
          region: address.state || undefined,
          country: address.country || undefined,
        }
      } catch {
        // If reverse geocoding fails, still return coordinates.
        return { lat, lng }
      }
    } catch {
      return null
    }
  }, [])

  return { requestLocation }
}
