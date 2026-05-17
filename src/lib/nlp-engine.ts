import { Contact, ExpenseSplit } from '@/types/split';
import { contactService } from './contact-service';
import { format, subDays, startOfWeek, getDay } from 'date-fns';

export interface ParsedNLPData {
  amount?: number;
  vendor?: string;
  category?: string;
  date?: string;
  description?: string;
  paidBy?: string; // Contact ID or 'user'
  split?: ExpenseSplit;
  newContactsToCreate?: string[];
}

// Convert words like "twelve hundred" or "five thousand" into numbers
const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000, lac: 100000, lakh: 100000
};

function wordsToNumber(text: string): number | null {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  let total = 0;
  let currentVal = 0;
  let found = false;

  for (const word of words) {
    // Check if it's already a digit
    if (/^\d+(\.\d+)?$/.test(word)) {
      currentVal = parseFloat(word);
      found = true;
      continue;
    }

    // Check abbreviation like 1.5k
    const kMatch = word.match(/^(\d+(?:\.\d+)?)\s*k$/);
    if (kMatch) {
      currentVal = parseFloat(kMatch[1]) * 1000;
      found = true;
      continue;
    }

    if (WORD_NUMBERS[word] !== undefined) {
      found = true;
      const val = WORD_NUMBERS[word];
      if (val === 100 || val === 1000 || val === 100000) {
        if (currentVal === 0) currentVal = 1;
        currentVal *= val;
        if (val === 1000 || val === 100000) {
          total += currentVal;
          currentVal = 0;
        }
      } else {
        currentVal += val;
      }
    }
  }

  total += currentVal;
  return found && total > 0 ? total : null;
}

export const nlpEngine = {
  parse(transcript: string): ParsedNLPData {
    const data: ParsedNLPData = {};
    const text = transcript.trim();
    const lowerText = text.toLowerCase();
    
    // 1. AMOUNT DETECTION (Numerical or words)
    // First, try standard numbers like "1200", "4000.50", "1.2k"
    const amountRegex = /(?:rs\.?|inr|rupees|bucks|usd|\$)\s*(\d+(?:\.\d+)?)\s*(?:k\b)?|(\d+(?:\.\d+)?)\s*(?:k\b)?\s*(?:rs\.?|inr|rupees|bucks|usd|\$)/i;
    const directMatch = lowerText.match(amountRegex);
    
    if (directMatch) {
      const matchVal = directMatch[1] || directMatch[2];
      let num = parseFloat(matchVal);
      // Check if it had a "k" suffix (e.g. 1.2k)
      const fullMatchedSegment = (directMatch[0] || '').toLowerCase();
      if (fullMatchedSegment.includes('k') && !fullMatchedSegment.includes('lakh')) {
        num *= 1000;
      }
      data.amount = num;
    } else {
      // Try parsing worded numbers like "twelve hundred rupees"
      const parsedVal = wordsToNumber(lowerText);
      if (parsedVal !== null) {
        data.amount = parsedVal;
      }
    }

    // 2. TEMPORAL / DATE DETECTION
    const date = new Date();
    if (lowerText.includes('yesterday')) {
      data.date = format(subDays(date, 1), 'yyyy-MM-dd');
    } else if (lowerText.includes('day before yesterday')) {
      data.date = format(subDays(date, 2), 'yyyy-MM-dd');
    } else if (lowerText.includes('today')) {
      data.date = format(date, 'yyyy-MM-dd');
    } else {
      // Detect specific days of the week: "last monday", "on friday"
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < 7; i++) {
        const dayName = daysOfWeek[i];
        if (lowerText.includes(dayName)) {
          const currentDayIdx = date.getDay();
          const targetDayIdx = i;
          let diff = currentDayIdx - targetDayIdx;
          if (diff <= 0) diff += 7; // Go to last week's day
          
          if (lowerText.includes(`last ${dayName}`)) {
            diff += 7; // Extra 7 days back
          }
          data.date = format(subDays(date, diff), 'yyyy-MM-dd');
          break;
        }
      }
    }

    // Fallback date to today if not parsed
    if (!data.date) {
      data.date = format(date, 'yyyy-MM-dd');
    }

    // 3. VENDOR DETECTION
    // Prepositions that usually precede vendor names
    const prepositions = [' spent at ', ' paid at ', ' at ', ' from ', ' paid to ', ' spent on ', ' merchant '];
    let vendorCandidate = '';
    
    for (const prep of prepositions) {
      const idx = lowerText.indexOf(prep);
      if (idx !== -1) {
        const start = idx + prep.length;
        // Grab the string following the preposition, up to another common command keyword
        const tail = text.substring(start);
        const stopKeywords = [
          'yesterday', 'today', 'for ', 'split', 'share', 'paid by', 'i paid', 'on ', 'using',
          'with ', 'in ', 'via', ' rupees', ' rs', ' inr'
        ];
        
        let endIdx = tail.length;
        for (const kw of stopKeywords) {
          const kwIdx = tail.toLowerCase().indexOf(kw);
          if (kwIdx !== -1 && kwIdx < endIdx) {
            endIdx = kwIdx;
          }
        }
        
        vendorCandidate = tail.substring(0, endIdx).trim();
        break;
      }
    }

    // Clean vendor candidate
    if (vendorCandidate) {
      // Filter out leading/trailing symbols or small helper words
      vendorCandidate = vendorCandidate.replace(/^[:,\-\s\./]+|[:,\-\s\./]+$/g, '').trim();
      vendorCandidate = vendorCandidate.replace(/\b(the|a|an)\b/gi, '').trim();
      
      // Capitalise first letters of vendor
      data.vendor = vendorCandidate.split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    // 4. CATEGORY PREDICTION (Fallback prediction using intelligence module)
    const catMappings: Record<string, string[]> = {
      meals: ['dinner', 'lunch', 'breakfast', 'food', 'coffee', 'starbucks', 'swiggy', 'zomato', 'restaurant', 'meal', 'pizza', 'burger', 'kfc', 'mcdonalds', 'cafe', 'tea', 'bakery', 'dining'],
      travel: ['taxi', 'uber', 'ola', 'flight', 'air', 'train', 'bus', 'auto', 'rickshaw', 'travel', 'trip', 'commute', 'metro', 'indigo', 'vistara', 'parking', 'toll'],
      fuel: ['petrol', 'diesel', 'fuel', 'gas', 'tank', 'filling', 'shell', 'hp', 'bpcl', 'iocl', 'cng', 'refill'],
      lodging: ['hotel', 'stay', 'accommodation', 'airbnb', 'room', 'rent', 'hostel', 'resort', 'oyo', 'makemytrip'],
      supplies: ['grocery', 'shopping', 'amazon', 'flipkart', 'market', 'mall', 'store', 'supermarket', 'blinkit', 'zepto', 'bigbasket', 'dmart', 'stationary'],
      communication: ['recharge', 'mobile', 'internet', 'wifi', 'data', 'phone', 'jio', 'airtel', 'vi', 'broadband', 'postpaid', 'prepaid'],
      healthcare: ['doctor', 'medicine', 'hospital', 'clinic', 'pharmacy', 'health', 'medical', 'test', 'apollo', 'pharmeasy', 'dental', 'vision', 'physio'],
      entertainment: ['movie', 'pvr', 'theatre', 'netflix', 'hotstar', 'gaming', 'club', 'party', 'concert', 'event', 'booking', 'show', 'prime video', 'spotify'],
      home: ['electricity', 'water', 'gas bill', 'maintenance', 'plumber', 'electrician', 'cleaning', 'urban company', 'furniture', 'appliance', 'utility'],
      clothing: ['shirt', 'pants', 'dress', 'clothes', 'fashion', 'zara', 'h&m', 'shopping', 'shoes', 'boots', 'jacket', 'nike', 'adidas', 'uniqlo', 'levis'],
    };

    for (const [cat, keywords] of Object.entries(catMappings)) {
      if (keywords.some(k => lowerText.includes(k))) {
        data.category = cat;
        break;
      }
    }

    // 5. DESCRIPTION DETECTION
    const forIndex = lowerText.indexOf(' for ');
    if (forIndex !== -1) {
      const tail = text.substring(forIndex + 5);
      const stopWords = ['split', 'share', 'paid by', 'i paid', 'yesterday', 'today', 'at ', 'with '];
      let endIdx = tail.length;
      for (const sw of stopWords) {
        const swIdx = tail.toLowerCase().indexOf(sw);
        if (swIdx !== -1 && swIdx < endIdx) {
          endIdx = swIdx;
        }
      }
      data.description = tail.substring(0, endIdx).trim();
    }

    // 6. SPLIT AND PAYER DETECTION
    // Get existing offline contacts to perform matching
    const contacts = contactService.getContacts();
    
    // Find who paid: "paid by Athish" or "Athish paid" or "I paid"
    let parsedPaidBy: string = 'user';
    const paidByMatch = lowerText.match(/(?:paid by|lent by|bill owner is)\s+([a-z]+)/i) || 
                        lowerText.match(/([a-z]+)\s+(?:paid|settled|cleared the bill)/i);
                        
    if (paidByMatch) {
      const name = paidByMatch[1].toLowerCase().trim();
      if (name === 'i' || name === 'me' || name === 'myself') {
        parsedPaidBy = 'user';
      } else {
        // Resolve contact
        const matchedContact = contacts.find(c => c.name.toLowerCase() === name);
        if (matchedContact) {
          parsedPaidBy = matchedContact.id;
        } else {
          // It's a new name! Let's trigger suggested new contact
          const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
          if (!data.newContactsToCreate) data.newContactsToCreate = [];
          data.newContactsToCreate.push(capitalizedName);
          // Temporary placeholder ID that we will swap after contact is created in the form
          parsedPaidBy = `NEW_CONTACT:${capitalizedName}`;
        }
      }
    }
    data.paidBy = parsedPaidBy;

    // Detect split: "split equally with X and Y" or "split with X and Y"
    const splitRegex = /(?:split|share|divide|settle)(?:\s+equally)?\s+with\s+([a-z\s,]+)/i;
    const splitMatch = lowerText.match(splitRegex);
    
    if (splitMatch) {
      const splitSegment = splitMatch[1];
      // Clean names by splitting on 'and', commas, and whitespace
      const nameTokens = splitSegment
        .replace(/\band\b/g, ',')
        .split(',')
        .map(n => n.trim())
        .filter(n => n.length > 0 && !['yesterday', 'today', 'for', 'rupees', 'rs', 'inr'].includes(n.toLowerCase()));

      const participantContactIds: string[] = [];

      for (const rawName of nameTokens) {
        const name = rawName.toLowerCase();
        if (name === 'me' || name === 'myself' || name === 'i') continue;

        const matchedContact = contacts.find(c => c.name.toLowerCase() === name);
        if (matchedContact) {
          participantContactIds.push(matchedContact.id);
        } else {
          const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          if (!data.newContactsToCreate) data.newContactsToCreate = [];
          if (!data.newContactsToCreate.includes(capitalizedName)) {
            data.newContactsToCreate.push(capitalizedName);
          }
          participantContactIds.push(`NEW_CONTACT:${capitalizedName}`);
        }
      }

      if (participantContactIds.length > 0) {
        // Construct the Split Object
        const totalAmount = data.amount || 0;
        const totalPeople = participantContactIds.length + 1; // +1 for user
        const share = totalAmount > 0 ? totalAmount / totalPeople : 0;

        data.split = {
          totalAmount,
          splitType: 'equal',
          members: participantContactIds.map(id => ({
            contactId: id,
            amount: Number(share.toFixed(2)),
            paid: false
          }))
        };
      }
    }

    return data;
  }
};
