import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { permissions } from '@/lib/permissions';
import { nlpEngine, ParsedNLPData } from '@/lib/nlp-engine';

interface VoiceInputProps {
  onParse: (data: ParsedNLPData) => void;
  autoStart?: boolean;
}

export function VoiceInput({ onParse, autoStart }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

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

    // Check permission first to avoid "unable to access" errors
    const checkPermission = async () => {
      const hasPermission = await permissions.checkMicrophonePermission();
      if (!hasPermission) {
        toast.info('Requesting microphone access...');
        await permissions.requestMicrophonePermission();
        // Check again after request
        const nowHasPermission = await permissions.checkMicrophonePermission();
        if (!nowHasPermission) {
          toast.error('Microphone access is required for voice input');
          return false;
        }
      }
      return true;
    };

    checkPermission().then(granted => {
      if (!granted) return;

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
    });
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const parseTranscript = (text: string) => {
    try {
      const data = nlpEngine.parse(text);
      onParse(data);
      haptics.success();
    } catch (e) {
      console.error('NLP Voice parsing error:', e);
    }
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
