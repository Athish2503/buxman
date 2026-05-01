import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceInputProps {
  onParse: (data: { amount?: number; vendor?: string; category?: string; date?: string; description?: string }) => void;
}

export function VoiceInput({ onParse }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice recognition not supported on this device');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let silenceTimer: any;
    const resetSilenceTimer = () => {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (isListening) stopListening();
      }, 4000); // 4 seconds of silence to stop
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      haptics.medium();
      resetSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      resetSilenceTimer();
      setError(null);
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        setTranscript(prev => prev + ' ' + final);
        parseTranscript(final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'no-speech') {
        setError('no-speech');
        haptics.warning();
      } else if (event.error === 'not-allowed') {
        setIsListening(false);
        toast.error('Microphone access denied');
      } else {
        setIsListening(false);
        toast.error(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      clearTimeout(silenceTimer);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const parseTranscript = (text: string) => {
    const lowerText = text.toLowerCase();
    const data: any = {};

    // --- 1. AMOUNT DETECTION ---
    const amountMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs|inr|bucks|dollars|euro|pounds)?/i) ||
                        lowerText.match(/(?:rupees|rs|inr|bucks|dollars|euro|pounds)\s*(\d+(?:\.\d+)?)/i);
    
    if (amountMatch) {
      data.amount = parseFloat(amountMatch[1]);
    }

    // --- 2. VENDOR DETECTION ---
    const vendorPatterns = [
      /(?:at|from|to|paid|merchant|spent at)\s+([a-z0-9\s]+?)(?=\s+(yesterday|today|for|on|in|using|with|via|$))/i,
      /([a-z0-9\s]+?)\s+(?:bill|payment|expense)/i
    ];

    for (const pattern of vendorPatterns) {
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        data.vendor = match[1].trim().replace(/\b(the|a|an)\b/g, '').trim();
        break;
      }
    }

    // --- 3. CATEGORY DETECTION ---
    const catMappings: Record<string, string[]> = {
      meals: ['dinner', 'lunch', 'breakfast', 'food', 'coffee', 'starbucks', 'swiggy', 'zomato', 'restaurant', 'meal', 'pizza', 'burger', 'kfc', 'mcdonalds', 'cafe', 'tea', 'bakery'],
      travel: ['taxi', 'uber', 'ola', 'flight', 'air', 'train', 'bus', 'auto', 'rickshaw', 'travel', 'trip', 'commute', 'metro', 'indigo', 'vistara', 'parking', 'toll'],
      fuel: ['petrol', 'diesel', 'fuel', 'gas', 'tank', 'filling', 'shell', 'hp', 'bpcl', 'iocl', 'cng', 'refill'],
      lodging: ['hotel', 'stay', 'accommodation', 'airbnb', 'room', 'rent', 'hostel', 'resort', 'oyo', 'makemytrip'],
      supplies: ['grocery', 'shopping', 'amazon', 'flipkart', 'market', 'mall', 'store', 'supermarket', 'blinkit', 'zepto', 'bigbasket', 'dmart', 'stationary'],
      communication: ['recharge', 'mobile', 'internet', 'wifi', 'data', 'phone', 'jio', 'airtel', 'vi', 'broadband', 'postpaid', 'prepaid'],
      healthcare: ['doctor', 'medicine', 'hospital', 'clinic', 'pharmacy', 'health', 'medical', 'test', 'apollo', 'pharmeasy', 'dental', 'vision', 'physio'],
      entertainment: ['movie', 'pvr', 'theatre', 'netflix', 'hotstar', 'gaming', 'club', 'party', 'concert', 'event', 'booking', 'show', 'prime video', 'spotify'],
      home: ['electricity', 'water', 'gas bill', 'maintenance', 'plumber', 'electrician', 'cleaning', 'urban company', 'furniture', 'appliance', 'utility'],
    };

    for (const [cat, keywords] of Object.entries(catMappings)) {
      if (keywords.some(k => lowerText.includes(k))) {
        data.category = cat;
        break;
      }
    }

    // --- 4. DATE DETECTION ---
    const date = new Date();
    if (lowerText.includes('yesterday')) {
      date.setDate(date.getDate() - 1);
      data.date = date.toISOString().split('T')[0];
    } else if (lowerText.includes('day before yesterday')) {
      date.setDate(date.getDate() - 2);
      data.date = date.toISOString().split('T')[0];
    } else if (lowerText.includes('today')) {
      data.date = date.toISOString().split('T')[0];
    }

    // --- 5. DESCRIPTION ---
    if (lowerText.includes('for ')) {
      const descMatch = lowerText.match(/for\s+(.+?)(?=\s+(at|on|yesterday|today|last|$))/i);
      if (descMatch) data.description = descMatch[1].trim();
    }

    onParse(data);
    haptics.success();
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={startListening}
        className={cn(
          "h-10 w-10 rounded-full transition-all duration-500 relative z-10",
          isListening 
            ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]" 
            : "bg-muted/50 border-border/40 hover:bg-muted"
        )}
      >
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.div
              key="listening"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
            >
              <Sparkles className="h-5 w-5 animate-pulse" />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Mic className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {isListening && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-primary/30 pointer-events-none"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut", delay: 0.5 }}
              className="absolute inset-0 rounded-full border border-primary/20 pointer-events-none"
            />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed bottom-24 left-4 right-4 md:absolute md:bottom-full md:mb-6 md:left-1/2 md:-translate-x-1/2 md:w-80 md:right-auto glass p-4 rounded-2xl border border-primary/20 shadow-2xl z-[100] text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 12, 4] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                      className="w-1 bg-primary rounded-full"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Listening...</span>
              </div>
              <p className="text-xs font-medium line-clamp-2">
                {error === 'no-speech' 
                  ? "No speech detected. Please speak louder or check your mic."
                  : (interimTranscript || transcript || "Say something like \"Spent 500 at Starbucks yesterday for coffee\"")
                }
              </p>
              <button 
                onClick={(e) => { e.stopPropagation(); stopListening(); }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
