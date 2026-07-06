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
  posterUrl?: string;  // Poster image URL from OMDb
  releaseYear?: string; // e.g. "2023"
  createdAt: string;
  updatedAt: string;
}
