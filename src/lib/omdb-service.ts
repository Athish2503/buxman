import { settingsService } from './settings';

// Bundled default key from .env — can be overridden in Settings → Data Management
const ENV_OMDB_KEY = import.meta.env.VITE_OMDB_API_KEY as string | undefined;

export interface OmdbSearchResult {
  imdbID: string;
  Title: string;
  Year: string;
  Type: 'movie' | 'series' | 'episode';
  Poster: string; // URL or "N/A"
}

export interface OmdbSearchResponse {
  Search?: OmdbSearchResult[];
  totalResults?: string;
  Response: 'True' | 'False';
  Error?: string;
}

import { MediaPlatform } from '@/types/media';

export interface OmdbDetailResult {
  imdbID: string;
  Title: string;
  Year: string;
  Genre: string; // comma-separated
  Type: string;
  Poster: string;
  imdbRating: string;
  Plot?: string;
  Director?: string;
  Actors?: string;
  Runtime?: string;
  Rated?: string;
  Awards?: string;
  Production?: string;
  Website?: string;
  Response: 'True' | 'False';
}

export interface MediaSearchSuggestion {
  imdbId: string;
  title: string;
  year: string;
  type: 'movie' | 'series';
  posterUrl: string | null;
  genres: string[];
  imdbRating?: string;
  plot?: string;
  director?: string;
  actors?: string;
  runtime?: string;
  rated?: string;
  awards?: string;
  platform?: MediaPlatform;
}

const BASE = 'https://www.omdbapi.com';

function detectPlatform(data: OmdbDetailResult): MediaPlatform | undefined {
  const text = `${data.Production || ''} ${data.Website || ''} ${data.Plot || ''} ${data.Title || ''}`.toLowerCase();
  if (text.includes('netflix')) return 'netflix';
  if (text.includes('prime video') || text.includes('amazon studios') || text.includes('amazon prime') || text.includes('primevideo')) return 'prime';
  if (text.includes('disney') || text.includes('marvel studios') || text.includes('pixar')) return 'disney';
  if (text.includes('hbo') || text.includes('max.com') || text.includes('warner bros')) return 'hbo';
  if (text.includes('hotstar') || text.includes('star india') || text.includes('jio')) return 'hotstar';
  if (text.includes('apple tv') || text.includes('apple.com') || text.includes('apple original')) return 'appletv';
  if (text.includes('peacock') || text.includes('universal pictures')) return 'peacock';
  if (text.includes('youtube')) return 'youtube';
  return undefined;
}

/** Extract just the bare API key, even if the user accidentally pasted a full OMDb URL. */
function sanitizeKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('http')) {
    try {
      const url = new URL(trimmed);
      const extracted = url.searchParams.get('apikey');
      if (extracted && extracted.trim()) return extracted.trim();
    } catch {}
  }
  return trimmed;
}

function getKey(): string {
  const settings = settingsService.get();
  const settingsKey = settings.omdbApiKey;
  if (settingsKey && settingsKey.trim()) return sanitizeKey(settingsKey);
  if (ENV_OMDB_KEY && ENV_OMDB_KEY.trim()) return sanitizeKey(ENV_OMDB_KEY);
  return '';
}

export const omdbService = {
  isConfigured(): boolean {
    return !!getKey();
  },

  /**
   * Search titles — returns up to 10 suggestions
   */
  async search(query: string, type?: 'movie' | 'series'): Promise<MediaSearchSuggestion[]> {
    const key = getKey();
    if (!key || !query.trim()) return [];

    try {
      const params = new URLSearchParams({
        apikey: key,
        s: query.trim(),
        ...(type ? { type } : {}),
      });

      const res = await fetch(`${BASE}/?${params.toString()}`);
      if (!res.ok) return [];

      const data: OmdbSearchResponse = await res.json();
      if (data.Response !== 'True' || !data.Search) return [];

      // Filter to movie/series only (exclude episodes)
      return data.Search
        .filter(r => r.Type === 'movie' || r.Type === 'series')
        .slice(0, 8)
        .map(r => ({
          imdbId: r.imdbID,
          title: r.Title,
          year: r.Year,
          type: r.Type as 'movie' | 'series',
          posterUrl: r.Poster !== 'N/A' ? r.Poster : null,
          genres: [], // filled lazily on selection
        }));
    } catch {
      return [];
    }
  },

  /**
   * Fetch full detail for a specific imdb ID to get genres
   */
  async getDetail(imdbId: string): Promise<Partial<MediaSearchSuggestion> | null> {
    const key = getKey();
    if (!key) return null;

    try {
      const params = new URLSearchParams({ apikey: key, i: imdbId, plot: 'full' });
      const res = await fetch(`${BASE}/?${params.toString()}`);
      if (!res.ok) return null;

      const data: OmdbDetailResult = await res.json();
      if (data.Response !== 'True') return null;

      const genres = data.Genre
        ? data.Genre.split(',').map(g => g.trim()).filter(Boolean)
        : [];

      return {
        imdbId: data.imdbID,
        title: data.Title,
        year: data.Year,
        type: (data.Type === 'series' ? 'series' : 'movie') as 'movie' | 'series',
        posterUrl: data.Poster !== 'N/A' ? data.Poster : null,
        genres,
        imdbRating: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : undefined,
        plot: data.Plot && data.Plot !== 'N/A' ? data.Plot : undefined,
        director: data.Director && data.Director !== 'N/A' ? data.Director : undefined,
        actors: data.Actors && data.Actors !== 'N/A' ? data.Actors : undefined,
        runtime: data.Runtime && data.Runtime !== 'N/A' ? data.Runtime : undefined,
        rated: data.Rated && data.Rated !== 'N/A' ? data.Rated : undefined,
        awards: data.Awards && data.Awards !== 'N/A' ? data.Awards : undefined,
        platform: detectPlatform(data),
      };
    } catch {
      return null;
    }
  },
};
