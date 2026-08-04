import { NfcExchangePayload } from '@/types/nfc';
import { haptics } from './haptics';

// Web NFC type declarations for TypeScript environment
declare global {
  interface Window {
    NDEFReader?: any;
  }
}

export const BUXMAN_NFC_RECORD_TYPE = 'application/vnd.buxman.nfc+json';
export const BUXMAN_NFC_PREFIX = 'BUXMAN_NFC_BEAM_V1:';

class NfcService {
  private activeController: AbortController | null = null;

  /**
   * Check if Web NFC API is supported on the current device/browser environment
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'NDEFReader' in window;
  }

  /**
   * Encode any NfcExchangePayload into a formatted string or Uint8Array
   */
  encodePayload(payload: NfcExchangePayload): string {
    const rawJson = JSON.stringify(payload);
    return `${BUXMAN_NFC_PREFIX}${rawJson}`;
  }

  /**
   * Decode text/NDEF data into an NfcExchangePayload if valid
   */
  decodePayload(rawText: string): NfcExchangePayload | null {
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith(BUXMAN_NFC_PREFIX)) {
        cleaned = cleaned.substring(BUXMAN_NFC_PREFIX.length);
      }
      const data = JSON.parse(cleaned);
      if (data && typeof data === 'object' && data.type) {
        return data as NfcExchangePayload;
      }
      return null;
    } catch (e) {
      console.warn('Failed to parse NFC payload:', e);
      return null;
    }
  }

  /**
   * Write an NFC payload to an NFC tag or another listening phone via NDEFReader.write()
   */
  async writePayload(payload: NfcExchangePayload): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Web NFC not supported on this platform');
      return false;
    }

    try {
      const ndef = new window.NDEFReader();
      const encodedText = this.encodePayload(payload);

      await ndef.write({
        records: [
          {
            recordType: 'mime',
            mediaType: BUXMAN_NFC_RECORD_TYPE,
            data: new TextEncoder().encode(encodedText),
          },
          {
            recordType: 'text',
            data: encodedText,
          }
        ]
      });

      await haptics.success();
      return true;
    } catch (err) {
      console.error('NFC Write Error:', err);
      await haptics.error();
      throw err;
    }
  }

  /**
   * Start listening for incoming NFC tags/beams
   */
  async startListening(
    onPayloadReceived: (payload: NfcExchangePayload) => void,
    onError?: (err: any) => void
  ): Promise<() => void> {
    if (!this.isSupported()) {
      onError?.(new Error('NFC is not supported on this device'));
      return () => {};
    }

    this.stopListening();
    this.activeController = new AbortController();

    try {
      const ndef = new window.NDEFReader();
      await ndef.scan({ signal: this.activeController.signal });

      ndef.onreading = async (event: any) => {
        try {
          await haptics.medium();
          const records = event.message?.records || [];

          for (const record of records) {
            let textContent = '';

            if (record.data) {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              textContent = decoder.decode(record.data);
            }

            const parsedPayload = this.decodePayload(textContent);
            if (parsedPayload) {
              await haptics.success();
              onPayloadReceived(parsedPayload);
              return;
            }
          }
        } catch (readErr) {
          console.error('NFC Reading Parse Error:', readErr);
        }
      };

      ndef.onreadingerror = async (err: any) => {
        console.warn('NFC Reading Error:', err);
        await haptics.warning();
        onError?.(err);
      };

    } catch (scanErr) {
      console.error('NFC Scan Start Error:', scanErr);
      onError?.(scanErr);
    }

    return () => this.stopListening();
  }

  /**
   * Stop active NFC scan listener
   */
  stopListening(): void {
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
    }
  }
}

export const nfcService = new NfcService();
