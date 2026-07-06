export interface MediaRecommendation {
  id: string;
  title: string;
  type: 'movie' | 'series';
  genres: string[];
  recommendedBy?: string; // Contact ID
  status: 'to_watch' | 'watching' | 'watched';
  rating?: number; // 1 to 5 stars (optional)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
