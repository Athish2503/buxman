export type MediaPlatform =
  | 'netflix'
  | 'prime'
  | 'disney'
  | 'hbo'
  | 'hotstar'
  | 'appletv'
  | 'peacock'
  | 'theatre'
  | 'youtube'
  | 'other';

export interface MediaRecommendation {
  id: string;
  title: string;
  type: 'movie' | 'series';
  genres: string[];
  recommendedBy?: string; // Contact ID
  status: 'to_watch' | 'watching' | 'watched';
  rating?: number; // 1 to 5 stars (optional)
  notes?: string;
  // New fields
  platform?: MediaPlatform;
  pinned?: boolean;
  // OMDb rich details
  imdbId?: string;
  imdbRating?: string;  // e.g. "8.6/10"
  plot?: string;        // Synopsis from OMDb
  director?: string;    // e.g. "Christopher Nolan"
  actors?: string;      // e.g. "Leonardo DiCaprio, Joseph Gordon-Levitt"
  runtime?: string;     // e.g. "148 min"
  rated?: string;       // e.g. "PG-13"
  awards?: string;      // e.g. "Won 4 Oscars"
  createdAt: string;
  updatedAt: string;
}
