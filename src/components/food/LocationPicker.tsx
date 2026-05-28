import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Loader2, Compass, CheckCircle2, AlertTriangle, Crosshair } from 'lucide-react';
import { geocoder } from '@/lib/geocoder';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

// Import Leaflet styles
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  address: string;
  onChangeAddress: (address: string) => void;
  lat?: number;
  lng?: number;
  onChangeCoords: (coords: { lat?: number; lng?: number }) => void;
}

export function LocationPicker({
  address,
  onChangeAddress,
  lat,
  lng,
  onChangeCoords,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(address);
  const LeafletRef = useRef<any>(null);

  // Debounce ref for address autocomplete search
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Debounce ref for reverse geocoding on map drag
  const reverseGeocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep local input state synced with parent address prop (but don't overwrite user typing)
  useEffect(() => {
    if (address !== inputValue && !isSearching) {
      setInputValue(address);
    }
  }, [address]);

  // Load Leaflet dynamically
  useEffect(() => {
    let map: any = null;

    const initMap = async () => {
      if (!mapContainerRef.current) return;

      const L = await import('leaflet');
      LeafletRef.current = L;

      // Fix default marker icon issues in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Default coordinates: Bangalore if none provided
      const initialLat = lat ?? 12.9716;
      const initialLng = lng ?? 77.5946;
      const initialZoom = lat && lng ? 16 : 12;

      // Initialize map instance
      map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: false,
      });

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add premium Dark Maps tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Register map click listener to place pin
      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        handleMapInteraction(clickLat, clickLng);
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);
      if (reverseGeocodeTimeoutRef.current) clearTimeout(reverseGeocodeTimeoutRef.current);
    };
  }, []);

  // Update pin and pan map when coordinates change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !LeafletRef.current) return;

    const map = mapInstanceRef.current;
    const L = LeafletRef.current;

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (lat !== undefined && lng !== undefined) {
      // Define custom green/purple glowing pin matching style
      const customPin = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute w-6 h-6 rounded-full opacity-35 animate-ping bg-primary"></div>
            <div class="relative w-6 h-6 rounded-full border border-white/20 shadow-glow flex items-center justify-center bg-primary" style="box-shadow: 0 0 12px var(--primary);">
              <svg class="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Create new draggable marker
      const newMarker = L.marker([lat, lng], {
        icon: customPin,
        draggable: true,
      }).addTo(map);

      // Listen for drag end events
      newMarker.on('dragend', () => {
        haptics.light();
        const pos = newMarker.getLatLng();
        handleMapInteraction(pos.lat, pos.lng, false); // Don't recenter on drag
      });

      markerRef.current = newMarker;

      // Pan to new coordinate
      map.setView([lat, lng], map.getZoom() < 14 ? 15 : map.getZoom());
    }
  }, [lat, lng, mapLoaded]);

  // Recenter map on current coordinates
  const handleRecenter = () => {
    if (mapInstanceRef.current && lat !== undefined && lng !== undefined) {
      haptics.selection();
      mapInstanceRef.current.setView([lat, lng], 16);
    }
  };

  // Perform geocoding/reverse-geocoding when map is clicked or marker dragged
  const handleMapInteraction = (newLat: number, newLng: number, recenter = true) => {
    onChangeCoords({ lat: newLat, lng: newLng });

    if (reverseGeocodeTimeoutRef.current) {
      clearTimeout(reverseGeocodeTimeoutRef.current);
    }

    // Debounce reverse geocoding request (OSM Nominatim)
    reverseGeocodeTimeoutRef.current = setTimeout(() => {
      setIsSearching(true);
      geocoder.reverseGeocode(newLat, newLng)
        .then((resolvedAddress) => {
          const cleanAddr = resolvedAddress || `Pin: ${newLat.toFixed(5)}, ${newLng.toFixed(5)}`;
          onChangeAddress(cleanAddr);
          setInputValue(cleanAddr);
        })
        .catch((err) => {
          console.error('Reverse geocode error', err);
          toast.error('Could not fetch address for this pin.');
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 600);
  };

  // Handle typing inside address search input
  const handleInputChange = (val: string) => {
    setInputValue(val);
    onChangeAddress(val);

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Check if input is a coordinates string or a Google Maps URL
    const isUrl = val.startsWith('http') || val.includes('google.com/maps') || val.includes('maps.app.goo.gl');
    const coordsMatch = geocoder.parseCoordinates(val);

    if (isUrl) {
      // Trigger instant link geocoding
      handleLinkOrCoordResolve(val, true);
      return;
    }

    if (coordsMatch) {
      // Trigger instant coords geocoding
      handleLinkOrCoordResolve(val, false);
      return;
    }

    // Debounce autocompleting queries from OpenStreetMap
    autocompleteTimeoutRef.current = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`, {
        headers: { 'User-Agent': 'Buxman-Dining-Map-Geocoder' }
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setSuggestions(data);
            setShowSuggestions(data.length > 0);
          }
        })
        .catch((err) => console.warn('Autocomplete fetch failed', err));
    }, 500);
  };

  // Resolve typed coords or Google Maps link immediately
  const handleLinkOrCoordResolve = async (inputStr: string, isUrl: boolean) => {
    setIsSearching(true);
    let targetStr = inputStr.trim();
    
    if (isUrl) {
      toast.info('Analyzing Google Maps link...');
    }

    try {
      const result = await geocoder.geocode(targetStr);
      if (result.lat && result.lng) {
        onChangeCoords({ lat: result.lat, lng: result.lng });
        if (result.address) {
          onChangeAddress(result.address);
          setInputValue(result.address);
        }
        haptics.success();
        toast.success(isUrl ? 'Coordinates extracted from link!' : 'Coordinates parsed!');
      } else {
        toast.error('Could not extract location coordinates from this link.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to resolve address coordinates.');
    } finally {
      setIsSearching(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Select an autocomplete suggestion
  const handleSelectSuggestion = (item: any) => {
    const selectedAddress = item.display_name;
    const selectedLat = parseFloat(item.lat);
    const selectedLng = parseFloat(item.lon);

    haptics.selection();
    setInputValue(selectedAddress);
    onChangeAddress(selectedAddress);
    onChangeCoords({ lat: selectedLat, lng: selectedLng });
    setSuggestions([]);
    setShowSuggestions(false);

    toast.success(`Pinned: ${selectedAddress.split(',')[0]}`);
  };

  // Force text search geocoding when user hits Enter or clicks the search button
  const triggerManualSearch = async () => {
    if (!inputValue.trim()) return;
    setIsSearching(true);
    toast.info(`Geocoding "${inputValue.split(',')[0]}"...`);
    
    try {
      const result = await geocoder.geocode(inputValue);
      onChangeCoords({ lat: result.lat, lng: result.lng });
      if (result.address) {
        onChangeAddress(result.address);
        setInputValue(result.address);
      }
      haptics.success();
      toast.success('Location found & pinned!');
    } catch (e) {
      toast.error('Address not found. Please try dragging the pin manually.');
    } finally {
      setIsSearching(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const hasCoords = lat !== undefined && lng !== undefined;

  return (
    <div className="space-y-3">
      {/* Address Input & Suggestions */}
      <div className="relative">
        <div className="relative">
          <Input
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              // Timeout to let click registers on suggestion list before hiding
              setTimeout(() => setShowSuggestions(false), 250);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                triggerManualSearch();
              }
            }}
            placeholder="Type address, search query or paste Google Maps URL"
            className="h-11 bg-background/50 border-white/10 text-sm font-medium rounded-2xl pl-10 pr-10 focus:border-primary/50 transition-all"
            autoComplete="off"
          />
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <button
                type="button"
                onClick={triggerManualSearch}
                className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Floating Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-[1050] mt-2 bg-card/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1 max-h-56 overflow-y-auto no-scrollbar">
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 py-1.5 border-b border-white/5">Suggested Addresses</p>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors flex flex-col gap-0.5 text-xs rounded-xl group"
              >
                <span className="font-bold text-white group-hover:text-primary transition-colors truncate w-full">
                  {item.display_name.split(',')[0]}
                </span>
                <span className="text-[10px] text-muted-foreground/60 truncate w-full">
                  {item.display_name.split(',').slice(1).join(',').trim()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mini Leaflet Map Container */}
      <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-xl bg-black/45">
        <div
          ref={mapContainerRef}
          className="w-full h-48 rounded-[2rem]"
          style={{ zIndex: 1 }}
        />

        {/* Map Overlays for verification */}
        <div className="absolute bottom-2 left-2 z-[999] flex flex-wrap gap-1.5 pointer-events-none">
          {hasCoords ? (
            <Badge className="bg-emerald-500/80 border-transparent text-white text-[9px] font-bold py-1 px-2.5 backdrop-blur-md flex items-center gap-1 shadow-md">
              <CheckCircle2 className="h-3 w-3" />
              VERIFIED PIN
            </Badge>
          ) : (
            <Badge className="bg-rose-500/80 border-transparent text-white text-[9px] font-bold py-1 px-2.5 backdrop-blur-md flex items-center gap-1 shadow-md animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              COORDINATES MISSING
            </Badge>
          )}

          {hasCoords && (
            <Badge className="bg-black/75 border-white/10 text-white/70 text-[9px] font-medium py-1 px-2.5 backdrop-blur-md shadow-md">
              {lat!.toFixed(4)}, {lng!.toFixed(4)}
            </Badge>
          )}
        </div>

        {/* Manual adjustment instructions & Actions */}
        {hasCoords && (
          <button
            type="button"
            onClick={handleRecenter}
            className="absolute top-2 right-2 z-[999] p-2 bg-black/75 hover:bg-black border border-white/10 rounded-xl text-white/80 hover:text-white transition-all shadow-md cursor-pointer"
            title="Recenter pin"
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="text-[9px] text-muted-foreground/50 font-medium px-1.5 flex items-center gap-1 leading-normal">
        <Compass className="h-3 w-3 shrink-0 text-primary" />
        Address not exact? Paste a Google Maps link or drag the map pin to manually correct the restaurant location.
      </p>
    </div>
  );
}
