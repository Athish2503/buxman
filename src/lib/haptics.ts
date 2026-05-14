import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { audio } from './audio';
import { settingsService } from './settings';

/**
 * Safe wrapper for Capacitor Haptics synced with high-frequency audio cues.
 * Fails silently if running in a standard web browser without Capacitor native bridge.
 */
export const haptics = {
  async light() {
    if (!settingsService.get().hapticsEnabled) return;
    try { 
      audio.tick();
      await Haptics.impact({ style: ImpactStyle.Light }); 
    } catch (e) { /* web fallback */ }
  },
  async medium() {
    if (!settingsService.get().hapticsEnabled) return;
    try { 
      audio.tick();
      await Haptics.impact({ style: ImpactStyle.Medium }); 
    } catch (e) { /* web fallback */ }
  },
  async heavy() {
    if (!settingsService.get().hapticsEnabled) return;
    try { 
      audio.success();
      await Haptics.impact({ style: ImpactStyle.Heavy }); 
    } catch (e) { /* web fallback */ }
  },
  async success() {
    if (!settingsService.get().hapticsEnabled) return;
    try { 
      audio.shimmer();
      await Haptics.notification({ type: NotificationType.Success }); 
    } catch (e) { /* web fallback */ }
  },
  async warning() {
    if (!settingsService.get().hapticsEnabled) return;
    try { await Haptics.notification({ type: NotificationType.Warning }); } catch (e) { /* web fallback */ }
  },
  async error() {
    if (!settingsService.get().hapticsEnabled) return;
    try { 
      audio.error();
      await Haptics.notification({ type: NotificationType.Error }); 
    } catch (e) { /* web fallback */ }
  },
  async selection() {
    if (!settingsService.get().hapticsEnabled) return;
    try { 
      audio.tick();
      await Haptics.selectionChanged(); 
    } catch (e) { /* web fallback */ }
  }
};
