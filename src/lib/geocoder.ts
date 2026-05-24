/**
 * Offline-first Geocoder Utility
 * Attempts online geocoding via OpenStreetMap's Nominatim API,
 * with a fallback keyword matching engine for common cities when offline.
 */

interface Coordinates {
  lat: number;
  lng: number;
}

const CITY_COORDINATES: Record<string, Coordinates> = {
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bombay: { lat: 19.0760, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  noida: { lat: 28.5355, lng: 77.3910 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  goa: { lat: 15.2993, lng: 74.1240 },
  panaji: { lat: 15.4909, lng: 73.8278 },
  pune: { lat: 18.5204, lng: 73.8567 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  madras: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  calcutta: { lat: 22.5726, lng: 88.3639 },
  sanfrancisco: { lat: 37.7749, lng: -122.4194 },
  sf: { lat: 37.7749, lng: -122.4194 },
  newyork: { lat: 40.7128, lng: -74.0060 },
  ny: { lat: 40.7128, lng: -74.0060 },
  london: { lat: 51.5074, lng: -0.1278 },
  paris: { lat: 48.8566, lng: 2.3522 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  sydney: { lat: -33.8688, lng: 151.2093 }
};

export const geocoder = {
  async geocode(address: string): Promise<Coordinates> {
    const cleanAddress = address.trim();
    if (!cleanAddress) {
      // Default fallback coordinates if no address is supplied (e.g. Bangalore center)
      return this.getRandomizedDefault();
    }

    // 1. Try online Nominatim API search first
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Buxman-Dining-Map-Geocoder'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
          }
        }
      }
    } catch (e) {
      console.warn('Online geocoding failed or offline, checking local cache matches...', e);
    }

    // 2. Offline Fallback: Check for city name matching in address text
    const lowerAddress = cleanAddress.toLowerCase().replace(/[^a-z]/g, '');
    for (const city of Object.keys(CITY_COORDINATES)) {
      if (lowerAddress.includes(city)) {
        const baseCoords = CITY_COORDINATES[city];
        // Add a slight jitter offset to prevent overlapping markers in the same city
        const offsetLat = (Math.random() - 0.5) * 0.02;
        const offsetLng = (Math.random() - 0.5) * 0.02;
        return {
          lat: baseCoords.lat + offsetLat,
          lng: baseCoords.lng + offsetLng
        };
      }
    }

    // 3. Worst-case Fallback: Default randomized coordinates around default city (Bangalore)
    return this.getRandomizedDefault();
  },

  getRandomizedDefault(): Coordinates {
    // Center of Bangalore (12.9716, 77.5946) with randomized scatter offset of ~2.5km
    const offsetLat = (Math.random() - 0.5) * 0.04;
    const offsetLng = (Math.random() - 0.5) * 0.04;
    return {
      lat: 12.9716 + offsetLat,
      lng: 77.5946 + offsetLng
    };
  }
};
