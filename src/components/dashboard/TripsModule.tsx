import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip } from '@/types/split';
import { tripService } from '@/lib/trip-service';
import { contactService } from '@/lib/contact-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plane, Plus, MapPin, Calendar, Users, ChevronRight, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TripDetailView } from '../trips/TripDetailView';
import { ContactSelector } from '../split/ContactSelector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TripsModule() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  
  // New Trip State
  const [newName, setNewName] = useState('');
  const [newParticipants, setNewParticipants] = useState<string[]>([]);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  useEffect(() => {
    setTrips(tripService.getTrips());
  }, []);

  const handleCreateTrip = () => {
    if (newName.trim()) {
      const trip = tripService.addTrip({
        name: newName.trim(),
        participants: newParticipants,
        currency: 'INR',
        status: 'active'
      });
      setTrips(tripService.getTrips());
      setNewName('');
      setNewParticipants([]);
      setIsCreating(false);
      setSelectedTripId(trip.id);
    }
  };

  const handleDeleteTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTripToDelete(id);
  };

  const confirmDelete = () => {
    if (tripToDelete) {
      tripService.deleteTrip(tripToDelete);
      setTrips(tripService.getTrips());
      setTripToDelete(null);
    }
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Group Trips</h2>
          <p className="text-muted-foreground text-sm">Track shared expenses during your travels</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-glow gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Trip</span>
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {isCreating ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass rounded-3xl p-6 border border-border/40 space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Plane className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Create New Trip</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trip Name</label>
                <Input 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Goa Summer Trip 2024"
                  className="h-12 bg-background/50 border-border/40 rounded-xl text-lg font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add Participants</label>
                <ContactSelector 
                  selectedIds={newParticipants} 
                  onSelect={setNewParticipants} 
                />
              </div>

              <Button 
                onClick={handleCreateTrip}
                disabled={!newName.trim()}
                className="w-full h-12 bg-primary text-white rounded-xl font-bold text-lg"
              >
                Create Trip
              </Button>
            </div>
          </motion.div>
        ) : selectedTripId && selectedTrip ? (
          <TripDetailView 
            trip={selectedTrip} 
            onBack={() => {
              setSelectedTripId(null);
              setTrips(tripService.getTrips());
            }} 
          />
        ) : (
          <motion.div 
            className="grid gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {trips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 glass rounded-3xl border border-dashed border-border/40">
                <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center">
                  <Plane className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-bold text-lg text-muted-foreground">No trips yet</p>
                  <p className="text-sm text-muted-foreground/60">Create your first trip to start tracking shared expenses</p>
                </div>
                <Button variant="outline" onClick={() => setIsCreating(true)} className="rounded-xl border-dashed">
                  Start a Trip
                </Button>
              </div>
            ) : (
              trips.map(trip => (
                <motion.div
                  key={trip.id}
                  layoutId={`trip-card-${trip.id}`}
                  onClick={() => setSelectedTripId(trip.id)}
                  className="group relative overflow-hidden glass rounded-3xl p-5 border border-border/40 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-xl active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner border border-white/10 group-hover:scale-110 transition-transform">
                        <Plane className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">{trip.name}</h3>
                        <div className="flex items-center gap-3 text-muted-foreground text-xs mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {trip.participants.length + 1} people
                          </span>
                          <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                            {trip.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteTrip(trip.id, e)}
                        className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Decorative background element */}
                  <div className="absolute -right-10 -bottom-10 h-32 w-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!tripToDelete} onOpenChange={(open) => !open && setTripToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-border/40 glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">
              Delete "{trips.find(t => t.id === tripToDelete)?.name || 'Trip'}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove the trip and all its shared expense data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-border/40 hover:bg-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white border-none"
            >
              Delete Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
