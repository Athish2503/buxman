/**
 * Offline-first Geocoder Utility
 * Attempts online geocoding via OpenStreetMap's Nominatim API,
 * with support for Google Maps URL coordinate extraction, short URL expansion,
 * and a fallback keyword matching engine for common cities when offline.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  address?: string;
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
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  kovai: { lat: 11.0168, lng: 76.9558 },
  mysore: { lat: 12.2958, lng: 76.6394 },
  mysuru: { lat: 12.2958, lng: 76.6394 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  cochin: { lat: 9.9312, lng: 76.2673 },
  trivandrum: { lat: 8.5241, lng: 76.9366 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  trichy: { lat: 10.7905, lng: 78.7047 },
  tiruchirappalli: { lat: 10.7905, lng: 78.7047 },
  salem: { lat: 11.6643, lng: 78.1460 },
  vizag: { lat: 17.6868, lng: 83.2185 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
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
  /**
   * Parse coordinates out of standard Google Maps URLs or raw comma-separated values.
   */
  parseCoordinates(input: string): Coordinates | null {
    const trimmed = input.trim();
    
    // 1. Raw coordinates pattern: "12.9716, 77.5946" or "-12.9716,-77.5946"
    const rawMatch = trimmed.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (rawMatch) {
      const lat = parseFloat(rawMatch[1]);
      const lng = parseFloat(rawMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    // 2. @lat,lng in URL (e.g. google maps place urls: https://www.google.com/maps/place/Restaurant/@12.9716,77.5946,17z)
    const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    // 3. q=lat,lng, ll=lat,lng, cbll=lat,lng, center=lat,lng in URL queries
    const qMatch = trimmed.match(/[?&](?:q|ll|cbll|center)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    // 4. !3d!4d pattern in Google Maps URLs (exact POI location)
    const bangMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
    if (bangMatch) {
      const lat = parseFloat(bangMatch[1]);
      const lng = parseFloat(bangMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    // 5. /maps/search/lat,lng in URL (e.g. /maps/search/12.9716,77.5946 or /maps/search/12.9716+77.5946)
    const searchCoordsMatch = trimmed.match(/\/maps\/search\/(-?\d+(?:\.\d+)?)[,+](-?\d+(?:\.\d+)?)/);
    if (searchCoordsMatch) {
      const lat = parseFloat(searchCoordsMatch[1]);
      const lng = parseFloat(searchCoordsMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    return null;
  },

  /**
   * Extract restaurant name / search keywords from a Google Maps URL path or query
   */
  extractQueryFromUrl(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith('http')) return null;

    // Try to extract place name from /place/Restaurant+Name/
    const placeMatch = trimmed.match(/\/maps\/place\/([^/]+)/);
    if (placeMatch) {
      try {
        return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } catch (e) {
        return placeMatch[1].replace(/\+/g, ' ');
      }
    }
    
    // Try to extract search term from /search/Restaurant+Name/
    const searchMatch = trimmed.match(/\/maps\/search\/([^/]+)/);
    if (searchMatch && !searchMatch[1].match(/^-?\d/)) {
      try {
        return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
      } catch (e) {
        return searchMatch[1].replace(/\+/g, ' ');
      }
    }

    const qMatch = trimmed.match(/[?&]q=([^&"'>\s]+)/);
    if (qMatch) {
      try {
        return decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
      } catch (e) {
        return qMatch[1].replace(/\+/g, ' ');
      }
    }

    return null;
  },

  /**
   * Expand shortened URLs via a CORS-free proxy to inspect redirects.
   */
  async expandShortUrl(url: string): Promise<string | null> {
    const proxies = [
      {
        url: (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
        parse: (text: string) => text
      },
      {
        url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
        parse: (text: string) => text
      },
      {
        url: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
        parse: (text: string) => {
          try {
            const json = JSON.parse(text);
            return json.contents || '';
          } catch {
            return '';
          }
        }
      }
    ];

    for (const proxy of proxies) {
      try {
        const response = await fetch(proxy.url(url));
        if (response.ok) {
          const rawText = await response.text();
          const html = proxy.parse(rawText);
          if (!html) continue;

          // 1. Search for maps urls in redirect content
          const mapMatches = html.match(/(https?:\/\/www\.google\.[a-z.]+\/maps\/[^\s"'`>]+)/i);
          if (mapMatches && mapMatches[0]) {
            return decodeURIComponent(mapMatches[0].replace(/&amp;/g, '&'));
          }

          // 2. Search for full google search URL patterns in redirect payload or captcha title
          const urlMatches = html.match(/(https?:\/\/www\.google\.[a-z.]+\/search?[^\s"'`>]+)/i);
          if (urlMatches && urlMatches[0]) {
            return decodeURIComponent(urlMatches[0].replace(/&amp;/g, '&'));
          }
          
          // 3. Search for search paths in redirects
          const searchMatches = html.match(/\/search\?[^\s"'`>]+/i);
          if (searchMatches && searchMatches[0]) {
            return decodeURIComponent(`https://www.google.com${searchMatches[0]}`.replace(/&amp;/g, '&'));
          }
        }
      } catch (e) {
        console.warn(`Proxy failed: ${proxy.url(url)}`, e);
      }
    }
    return null;
  },

  /**
   * Reverse-geocodes coordinates via OpenStreetMap Nominatim to return a clean street address.
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'Buxman-Dining-Map-Geocoder'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          return data.display_name;
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding failed', e);
    }
    return null;
  },

  /**
   * Main geocoding interface.
   * Parses Google Maps URLs / coordinates, or falls back to text queries.
   */
  async geocode(address: string): Promise<GeocodeResult> {
    let cleanAddress = address.trim();
    if (!cleanAddress) {
      const coords = this.getRandomizedDefault();
      return { ...coords };
    }

    // 1. Detect and resolve shortened URLs first
    const isShortUrl = cleanAddress.includes('share.google') || 
                       cleanAddress.includes('maps.app.goo.gl') || 
                       cleanAddress.includes('goo.gl/maps');
    if (isShortUrl) {
      const expanded = await this.expandShortUrl(cleanAddress);
      if (expanded) {
        cleanAddress = expanded;
      }
    }

    // 2. Detect if the address string is actually a URL or coordinates
    const parsedCoords = this.parseCoordinates(cleanAddress);
    if (parsedCoords) {
      // It is coordinates! Let's reverse-geocode them to get the clean address text
      const reverseAddress = await this.reverseGeocode(parsedCoords.lat, parsedCoords.lng);
      return {
        lat: parsedCoords.lat,
        lng: parsedCoords.lng,
        address: reverseAddress || `Pin: ${parsedCoords.lat.toFixed(5)}, ${parsedCoords.lng.toFixed(5)}`
      };
    }

    // 3. Extract text search query if the cleanAddress is a redirect search URL or google maps URL
    let searchQuery = cleanAddress;
    const extractedQuery = this.extractQueryFromUrl(cleanAddress);
    if (extractedQuery) {
      searchQuery = extractedQuery;
    } else if (cleanAddress.includes('google.com/search') || cleanAddress.includes('q=')) {
      const qMatch = cleanAddress.match(/[?&]q=([^&"'>\s]+)/);
      if (qMatch) {
        searchQuery = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
      }
    }

    // 4. Normal text address geocoding: try online Nominatim API search first
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
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
            return { 
              lat, 
              lng, 
              address: data[0].display_name || searchQuery 
            };
          }
        }
      }
    } catch (e) {
      console.warn('Online geocoding failed or offline, checking local cache matches...', e);
    }

    // 5. Offline Fallback: Check for city name matching in address/query text
    const lowerAddress = searchQuery.toLowerCase().replace(/[^a-z]/g, '');
    for (const city of Object.keys(CITY_COORDINATES)) {
      if (lowerAddress.includes(city)) {
        const baseCoords = CITY_COORDINATES[city];
        // Add a slight jitter offset to prevent overlapping markers in the same city
        const offsetLat = (Math.random() - 0.5) * 0.02;
        const offsetLng = (Math.random() - 0.5) * 0.02;
        return {
          lat: baseCoords.lat + offsetLat,
          lng: baseCoords.lng + offsetLng,
          address: searchQuery
        };
      }
    }

    // 6. Worst-case Fallback: Default randomized coordinates around default city (Bangalore)
    const defCoords = this.getRandomizedDefault();
    return { ...defCoords, address: searchQuery };
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
