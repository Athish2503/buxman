import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { audio } from './audio';

/**
 * Safe wrapper for Capacitor Haptics synced with high-frequency audio cues.
 * Fails silently if running in a standard web browser without Capacitor native bridge.
 */
export const haptics = {
  async light() {
    try { 
      audio.tick();
      await Haptics.impact({ style: ImpactStyle.Light }); 
    } catch (e) { /* web fallback */ }
  },
  async medium() {
    try { 
      audio.tick();
      await Haptics.impact({ style: ImpactStyle.Medium }); 
    } catch (e) { /* web fallback */ }
  },
  async heavy() {
    try { 
      audio.success();
      await Haptics.impact({ style: ImpactStyle.Heavy }); 
    } catch (e) { /* web fallback */ }
  },
  async success() {
    try { 
      audio.shimmer();
      await Haptics.notification({ type: NotificationType.Success }); 
    } catch (e) { /* web fallback */ }
  },
  async warning() {
    try { await Haptics.notification({ type: NotificationType.Warning }); } catch (e) { /* web fallback */ }
  },
  async error() {
    try { 
      audio.error();
      await Haptics.notification({ type: NotificationType.Error }); 
    } catch (e) { /* web fallback */ }
  },
  async selection() {
    try { 
      audio.tick();
      await Haptics.selectionChanged(); 
    } catch (e) { /* web fallback */ }
  }
};
