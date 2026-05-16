export type DishStatus = 'liked' | 'not-recommended' | 'neutral';

export type PriceRange = 'budget' | 'mid' | 'premium' | 'luxury';

export interface Dish {
  id: string;
  name: string;
  status: DishStatus;
  notes: string; // Rich text (HTML)
  rating?: number; // 1-5
  images: string[]; // Base64 or local URIs
}

export interface DiningExperience {
  id: string;
  restaurantName: string;
  location?: {
    address: string;
    lat?: number;
    lng?: number;
    placeId?: string;
  };
  cuisine?: string;
  priceRange?: PriceRange;
  visitDate: string;
  dishes: Dish[];
  overallNotes?: string;
  overallRating?: number;
  _visitCount?: number; // Optional count for grouping UI
  createdAt: string;
}
