import { useEffect, useRef, useState } from 'react';
import { DiningExperience } from '@/types/food';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Compass, Search } from 'lucide-react';
import { haptics } from '@/lib/haptics';

// Import Leaflet styles
import 'leaflet/dist/leaflet.css';

interface CulinaryMapProps {
  experiences: DiningExperience[];
  onSelectExperience: (id: string) => void;
}

export function CulinaryMap({ experiences, onSelectExperience }: CulinaryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter experiences that have coordinates
  const experiencesWithCoords = experiences.filter(
    (exp) => exp.location?.lat !== undefined && exp.location?.lng !== undefined
  );

  useEffect(() => {
    let map: any = null;

    const initMap = async () => {
      if (!mapContainerRef.current) return;

      const L = await import('leaflet');

      // Initialize Map
      map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946], // Default center (Bangalore)
        zoom: 12,
        zoomControl: false, // We will manually place zoom control
      });

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add Premium Dark Maps Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapLoaded(true);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when experiences or map is loaded
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const drawMarkers = async () => {
      const L = await import('leaflet');

      experiencesWithCoords.forEach((exp) => {
        const lat = exp.location!.lat!;
        const lng = exp.location!.lng!;

        // Determine glow colors based on rating/status
        const hasLiked = exp.dishes.some((d) => d.status === 'liked');
        const hasDisliked = exp.dishes.some((d) => d.status === 'not-recommended');
        const glowColor = hasLiked ? '#10B981' : hasDisliked ? '#F43F5E' : '#7C3AED';

        // Custom Neon glowing Marker
        const customMarkerIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8">
              <div class="absolute w-6 h-6 rounded-full opacity-35 animate-ping" style="background-color: ${glowColor};"></div>
              <div class="relative w-5.5 h-5.5 rounded-full border border-white/20 shadow-glow flex items-center justify-center transition-all duration-300 hover:scale-110" style="background-color: ${glowColor}; box-shadow: 0 0 10px ${glowColor};">
                <svg class="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v4M21 2v20M17 2v10h4"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        // Popup Container Element
        const popupContainer = document.createElement('div');
        popupContainer.className = 'custom-leaflet-popup-content p-4 rounded-[1.8rem] bg-black/85 border border-white/10 text-white font-sans text-xs w-48 shadow-2xl relative overflow-hidden backdrop-blur-md';
        
        // Add decorative glow
        popupContainer.innerHTML = `
          <div class="absolute -right-4 -top-4 w-12 h-12 rounded-full blur-xl opacity-30" style="background-color: ${glowColor};"></div>
          <div class="space-y-2 relative z-10">
            <div class="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
              <span style="color: ${glowColor};">${exp.cuisine || 'Dining'}</span>
              <span>${exp.visitDate ? new Date(exp.visitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Undated'}</span>
            </div>
            <h4 class="font-black text-[13px] text-white tracking-tight leading-tight">${exp.restaurantName}</h4>
            <div class="flex items-center gap-1 text-[9px] text-white/50">
              <span>📍</span>
              <span class="truncate max-w-[120px] font-medium">${exp.location?.address.split(',')[0] || 'Unknown address'}</span>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-white/5">
              <span class="text-[8px] font-black uppercase text-white/40 tracking-wider">${exp.dishes.length} Items</span>
              <button id="popup-btn-${exp.id}" class="px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-wider rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-none shadow-glow-sm">
                Open
              </button>
            </div>
          </div>
        `;

        // Create marker
        const marker = L.marker([lat, lng], { icon: customMarkerIcon })
          .addTo(map)
          .bindPopup(popupContainer, {
            closeButton: false,
            className: 'custom-leaflet-popup-wrapper',
          });

        // Bind interactive event inside popup
        marker.on('popupopen', () => {
          haptics.selection();
          const btn = document.getElementById(`popup-btn-${exp.id}`);
          if (btn) {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              onSelectExperience(exp.id);
            });
          }
        });

        markersRef.current.push(marker);
      });

      // Fit bounds to display all coordinates
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.2));
      }
    };

    drawMarkers();
  }, [mapLoaded, experiences]);

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-500">
      <style>{`
        /* Custom Leaflet overrides */
        .custom-leaflet-popup-wrapper .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
        }
        .custom-leaflet-popup-wrapper .leaflet-popup-tip-container {
          display: none !important; /* Hide tip container to clean layout */
        }
        .leaflet-container {
          background: #0A0B10 !important;
          font-family: inherit !important;
        }
        .leaflet-bar {
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
        }
        .leaflet-bar a {
          background-color: rgba(22, 23, 27, 0.9) !important;
          color: white !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
          transition: background 200ms !important;
        }
        .leaflet-bar a:hover {
          background-color: rgba(255,255,255,0.05) !important;
        }
      `}</style>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Compass className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/80">Interactive Pinboard</h2>
            <p className="text-[10px] text-muted-foreground/40 font-medium">Culinary map of your logged restaurant visits</p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-[9px] font-black tracking-[0.1em] px-3">
          {experiencesWithCoords.length} VISITS PINNED
        </Badge>
      </div>

      <div className="relative">
        {/* Map Container */}
        <div
          ref={mapContainerRef}
          className="w-full h-[55vh] md:h-[60vh] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative"
        />

        {/* Empty state overlay if no pins available */}
        {experiencesWithCoords.length === 0 && (
          <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center text-center p-6 bg-black/60 backdrop-blur-sm rounded-[2.5rem]">
            <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <ChefHat className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
            </div>
            <h3 className="font-bold text-sm">No Pinned Locations Yet</h3>
            <p className="text-xs text-muted-foreground/60 max-w-xs mt-1">
              Add addresses with valid locations in your entries to see pins populated on this map.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
