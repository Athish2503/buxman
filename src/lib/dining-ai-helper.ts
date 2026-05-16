import { DiningExperience } from '@/types/food';

export interface SmartDiningEnhancement {
  summary: string;
  caption: string;
  hashtags: string[];
  emojiVersion: string;
  bestDish: string;
  moodTags: string[];
  serviceQuality: string;
  ambienceScore: number;
  crowdLevel: string;
  waitingTime: string;
  weatherMemory: string;
}

const MEMORY_POOLS = {
  captions: [
    "Late-night bites with rain outside and dangerously good flavors. Humanity occasionally succeeds.",
    "Archived like a sacred historical event. Perfect ambient lighting, unforgettable textures.",
    "Cinematic plating meets supreme culinary execution. Will be thinking about this meal for weeks.",
    "A masterclass in spices and atmosphere. Time stood still for these courses.",
    "Table stories filled with ambient laughter and sublime culinary craftsmanship.",
    "Simplicity executed perfectly. Good food, beautiful shadows, legendary company."
  ],
  weather: [
    "🌧️ Raining outside • 21°C",
    "🌙 Crisp late night • Ambient mood",
    "☀️ Golden hour warmth • 26°C",
    "✨ Starry evening • Breezy",
    "🌥️ Overcast & cozy • 18°C"
  ],
  moods: [
    ["Late Night", "Cinematic", "Soul Food", "Intimate"],
    ["Michelin Vibe", "Editorial", "Handcrafted", "Luxury"],
    ["Cozy Vibe", "Comfort Food", "Rain Outside", "Heartwarming"],
    ["Sleek & Modern", "Bustling", "Spontaneous", "Premium"],
    ["Retro Journal", "Nostalgic", "Bold Spices", "Memorable"]
  ]
};

export function generateSmartEnhancement(exp: DiningExperience): SmartDiningEnhancement {
  // Use unique ID or string length for stable deterministic mock AI generation
  const hash = exp.restaurantName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Best dish determination
  const likedDishes = exp.dishes.filter(d => d.status === 'liked');
  const bestDishObj = likedDishes.length > 0 ? likedDishes[0] : exp.dishes[0];
  const bestDish = bestDishObj ? bestDishObj.name : "Chef's Handcrafted Special";

  // Pick stable elements from pools based on hash
  const caption = MEMORY_POOLS.captions[hash % MEMORY_POOLS.captions.length];
  const weatherMemory = MEMORY_POOLS.weather[hash % MEMORY_POOLS.weather.length];
  const moodTags = MEMORY_POOLS.moods[hash % MEMORY_POOLS.moods.length];

  // Smart Summary
  const cuisineStr = exp.cuisine ? `${exp.cuisine} cuisine` : 'culinary art';
  const summary = exp.overallNotes || `A premium ${cuisineStr} encounter at ${exp.restaurantName}, distinguished by standout preparations of ${bestDish}. Highly recommended for those seeking thoughtful visual presentation and sophisticated flavors.`;

  // Hashtags
  const baseHashtags = ['#FoodChronicles', '#TableStories', '#CulinaryArchive', '#PremiumEats'];
  if (exp.cuisine) baseHashtags.push(`#${exp.cuisine.replace(/\s+/g, '')}`);
  
  // Emoji summary
  const dishListEmoji = exp.dishes.map(d => `✨ ${d.name}${d.price ? ` (₹${d.price})` : ''}`).join(' • ');
  const emojiVersion = `🍽️ ${exp.restaurantName}\n🌟 Highlights: ${dishListEmoji || bestDish}\n💭 "${caption}"`;

  // Dynamic ambience metrics
  const ambienceScores = [9.4, 9.6, 9.8, 9.2, 9.5];
  const ambienceScore = ambienceScores[hash % ambienceScores.length];

  const services = ["Impeccable & Attentive", "Warm & Editorial", "Prompt & Seamless", "Highly Knowledgeable"];
  const serviceQuality = services[hash % services.length];

  const crowds = ["Intimate & Quiet", "Vibrantly Social", "Comfortably Spaced", "Exclusive Seating"];
  const crowdLevel = crowds[hash % crowds.length];

  const waits = ["No Wait (Reserved)", "15 mins • Drinks served", "Walk-in seamless", "Worth the anticipation"];
  const waitingTime = waits[hash % waits.length];

  return {
    summary,
    caption,
    hashtags: baseHashtags,
    emojiVersion,
    bestDish,
    moodTags,
    serviceQuality,
    ambienceScore,
    crowdLevel,
    waitingTime,
    weatherMemory
  };
}
