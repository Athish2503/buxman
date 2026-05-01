import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Safe wrapper for Capacitor Haptics.
 * Fails silently if running in a standard web browser without Capacitor native bridge.
 */
export const haptics = {
  async light() {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { /* web fallback */ }
  },
  async medium() {
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { /* web fallback */ }
  },
  async heavy() {
    try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) { /* web fallback */ }
  },
  async success() {
    try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) { /* web fallback */ }
  },
  async warning() {
    try { await Haptics.notification({ type: NotificationType.Warning }); } catch (e) { /* web fallback */ }
  },
  async error() {
    try { await Haptics.notification({ type: NotificationType.Error }); } catch (e) { /* web fallback */ }
  },
  async selection() {
    try { await Haptics.selectionChanged(); } catch (e) { /* web fallback */ }
  }
};
