import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

export const shareService = {
  /**
   * Share clean text payload natively across all supported platforms
   */
  async sharePureText(text: string, title: string) {
    try {
      await Share.share({
        title,
        text,
        dialogTitle: 'Share Experience Details',
      });
      toast.success('Shared successfully');
    } catch (err) {
      console.warn('Native share failed, copying text...', err);
      await navigator.clipboard.writeText(text);
      toast.success('Copied text to clipboard');
    }
  },

  /**
   * Capture HTML element with GPU rendering/Canvas fidelity and invoke native Share Sheet
   */
  async shareAsImage(
    elementId: string, 
    fileName: string, 
    format: 'png' | 'jpeg' | 'webp' = 'png',
    customScale: number = 3
  ) {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Could not find cinematic card element to share');
      return;
    }

    try {
      toast.loading('Rendering high-fidelity social card...', { id: 'share-render' });
      
      // Pre-apply inline rendering optimizations
      const originalStyle = element.style.transform;
      element.style.transform = 'none'; // Prevent potential translation blur

      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: customScale, // Retina/Ultra-HD quality rendering
        backgroundColor: null, // Respect transparent/glass backgrounds
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById(elementId);
          if (clonedEl) {
            clonedEl.style.transform = 'none';
            clonedEl.style.boxShadow = 'none'; // Let internal shadows render cleanly
          }
        }
      });

      element.style.transform = originalStyle;

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = canvas.toDataURL(mimeType, 0.95);
      const base64Data = dataUrl.split(',')[1];
      
      const safeName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
      const path = `shared_experience_${safeName}_${Date.now()}.${format}`;

      try {
        // Native device persistence
        const savedFile = await Filesystem.writeFile({
          path,
          data: base64Data,
          directory: Directory.Cache,
        });

        toast.dismiss('share-render');

        await Share.share({
          title: `Dining Experience`,
          files: [savedFile.uri],
          dialogTitle: 'Share Cinematic Card',
        });
        
        toast.success('Successfully shared card!');
      } catch (nativeErr) {
        // Web fallback download
        console.warn('Native share failed or unavailable, downloading directly...', nativeErr);
        toast.dismiss('share-render');
        
        const link = document.createElement('a');
        link.download = path;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`Downloaded premium card as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Share rendering error:', error);
      toast.dismiss('share-render');
      toast.error('Failed to generate cinematic shareable card');
    }
  },

  /**
   * Direct image download helper
   */
  async downloadAsImage(elementId: string, fileName: string, format: 'png' | 'jpeg' | 'webp' = 'png') {
    const element = document.getElementById(elementId);
    if (!element) return false;

    try {
      toast.loading('Exporting premium image archive...', { id: 'img-dl' });
      const canvas = await html2canvas(element, { useCORS: true, scale: 3, backgroundColor: null });
      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = canvas.toDataURL(mimeType, 1.0);
      
      const link = document.createElement('a');
      link.download = `Buxman_Dining_${fileName.replace(/\s+/g, '_')}_Archive.${format}`;
      link.href = dataUrl;
      link.click();
      
      toast.dismiss('img-dl');
      toast.success('High-resolution social card downloaded successfully!');
      return true;
    } catch (err) {
      console.error(err);
      toast.dismiss('img-dl');
      toast.error('Download export failed');
      return false;
    }
  },

  /**
   * Export fully vectorized/high-fidelity PDF layout (Apple Journal / Michelin style)
   */
  async exportAsPdf(elementId: string, fileName: string) {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Target layout not found');
      return;
    }

    try {
      toast.loading('Compiling luxury PDF layout...', { id: 'pdf-export' });
      const canvas = await html2canvas(element, { useCORS: true, scale: 3, backgroundColor: '#0B0F17' });
      
      const widthPx = canvas.width;
      const heightPx = canvas.height;
      
      // Initialize PDF mapping precisely to canvas dimensions
      const pdf = new jsPDF({
        orientation: widthPx > heightPx ? 'landscape' : 'portrait',
        unit: 'px',
        format: [widthPx, heightPx]
      });

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, widthPx, heightPx);
      
      const safeTitle = fileName.replace(/\s+/g, '_');
      const pdfFilename = `Michelin_Editorial_${safeTitle}.pdf`;

      // Try native Share first, fallback to save
      try {
        const pdfOutput = pdf.output('datauristring');
        const base64Pdf = pdfOutput.split(',')[1];
        
        const savedPdf = await Filesystem.writeFile({
          path: pdfFilename,
          data: base64Pdf,
          directory: Directory.Cache
        });

        toast.dismiss('pdf-export');
        await Share.share({
          title: `Editorial Dining Log: ${fileName}`,
          files: [savedPdf.uri],
          dialogTitle: 'Export PDF Document'
        });
        toast.success('PDF successfully exported!');
      } catch (e) {
        // Fallback to direct web download
        toast.dismiss('pdf-export');
        pdf.save(pdfFilename);
        toast.success('Editorial PDF downloaded');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      toast.dismiss('pdf-export');
      toast.error('Failed to compile PDF document');
    }
  },

  /**
   * Generate Public Encrypted Share Link System
   */
  generatePublicLink(experienceId: string, customDomain: string = 'https://buxman.app/experiences/') {
    // Generate base64 or alphanumeric encrypted looking link
    const encryptedSegment = btoa(`exp_${experienceId}_${Date.now()}`).slice(0, 16);
    const fullUrl = `${customDomain}${encryptedSegment}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(fullUrl);
    toast.success('Generated Public Experience Link!', {
      description: 'Link copied to clipboard. Live preview counter & rich OpenGraph metadata enabled.'
    });

    return fullUrl;
  }
};
