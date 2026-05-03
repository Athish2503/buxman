import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from 'sonner';

export const shareService = {
  async shareAsImage(elementId: string, fileName: string) {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Could not find element to share');
      return;
    }

    try {
      toast.info('Generating high-res image...');
      
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2, // Higher resolution
        backgroundColor: '#000000',
        logging: false,
      });

      const base64Data = canvas.toDataURL('image/png').split(',')[1];
      
      // Save to temporary file
      const path = `share_${fileName}_${Date.now()}.png`;
      const savedFile = await Filesystem.writeFile({
        path,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Share via native share sheet
      await Share.share({
        title: `Dining Experience at ${fileName.replace(/_/g, ' ')}`,
        text: `Check out this amazing dining experience!`,
        files: [savedFile.uri],
        dialogTitle: 'Share Dining Experience',
      });
      
      toast.success('Ready to share!');
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate shareable image');
    }
  }
};
