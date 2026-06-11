import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { settingsService } from './settings';
import { dataMigrationService } from './data-migration';

// Default Client ID registered for localhost web development.
// Users can configure their own Client ID in Buxman Settings.
const DEFAULT_CLIENT_ID = '831613994276-o50uug3pghv66h3cshm7j0d2t32jpl9l.apps.googleusercontent.com';

class GoogleDriveService {
  /**
   * Retrieves the client ID to use (either custom configured by the user or default)
   */
  getClientId(): string {
    const settings = settingsService.get();
    return settings.googleDriveClientId || DEFAULT_CLIENT_ID;
  }

  /**
   * Constructs the Google OAuth2 authorization URL and initiates the redirect.
   * Saves the action (backup/restore) so we can resume it after redirect.
   */
  connect(action?: 'backup' | 'restore') {
    const clientId = this.getClientId();
    if (!clientId) {
      toast.error('Google Client ID is missing. Please configure one.');
      return;
    }

    // On Android Capacitor, window.location.origin returns 'capacitor://localhost'
    // which is NOT a valid OAuth redirect URI. We normalize it to 'http://localhost/'
    // which must be registered in Google Cloud Console as an Authorized Redirect URI.
    // On desktop/web, we use the real origin (e.g. http://localhost:5173/).
    const isNative = Capacitor.isNativePlatform();
    const redirectUri = isNative ? 'http://localhost/' : (window.location.origin + '/');
    const responseType = 'token';
    const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
    const state = Math.random().toString(36).substring(2);
    
    // Save oauth state and pending action to localStorage
    localStorage.setItem('google_drive_oauth_state', state);
    if (action) {
      localStorage.setItem('google_drive_pending_action', action);
    } else {
      localStorage.removeItem('google_drive_pending_action');
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}&` +
      `prompt=consent`;

    toast.info('Redirecting to Google Sign-In...');
    window.location.href = authUrl;
  }

  /**
   * Checks the URL hash on startup to intercept OAuth redirect parameters
   */
  handleRedirectCallback() {
    const hash = window.location.hash;
    if (!hash) return;

    if (hash.includes('access_token=') || hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1)); // strip the leading '#'
      const error = params.get('error');
      
      if (error) {
        console.error('[Google Drive] OAuth Error:', error);
        toast.error('Google Sign-In failed: ' + error);
        this.clearUrlHash();
        localStorage.removeItem('google_drive_pending_action');
        return;
      }

      const accessToken = params.get('access_token');
      const expiresIn = params.get('expires_in');
      const returnedState = params.get('state');
      const savedState = localStorage.getItem('google_drive_oauth_state');

      if (returnedState !== savedState) {
        console.error('[Google Drive] Security check state mismatch');
        toast.error('OAuth security check failed.');
        this.clearUrlHash();
        localStorage.removeItem('google_drive_pending_action');
        return;
      }

      if (accessToken) {
        const expiryTime = Date.now() + (Number(expiresIn) || 3600) * 1000;
        localStorage.setItem('google_drive_access_token', accessToken);
        localStorage.setItem('google_drive_token_expiry', expiryTime.toString());
        localStorage.removeItem('google_drive_oauth_state');
        
        this.clearUrlHash();
        
        // Fetch user profile and perform pending actions
        this.fetchUserInfoAndProcessPending();
      }
    }
  }

  private clearUrlHash() {
    window.history.replaceState(
      null, 
      "", 
      window.location.pathname + window.location.search
    );
  }

  /**
   * Retrieves the access token from storage, validating expiration
   */
  getAccessToken(): string | null {
    const token = localStorage.getItem('google_drive_access_token');
    const expiry = localStorage.getItem('google_drive_token_expiry');

    if (!token || !expiry) return null;

    // Check if token is expired (with a 2 minute grace window)
    if (Date.now() > Number(expiry) - 120000) {
      this.clearSession();
      return null;
    }

    return token;
  }

  /**
   * Fetches user profile info and runs any saved pending actions
   */
  async fetchUserInfoAndProcessPending() {
    const token = this.getAccessToken();
    if (!token) return;

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to get user profile');
      const data = await response.json();
      const email = data.email || 'Connected Account';

      const settings = settingsService.get();
      const updated = {
        ...settings,
        googleDriveBackupEnabled: true,
        googleDriveLinkedEmail: email
      };
      settingsService.save(updated);
      toast.success(`Connected to Google Drive as ${email}`);

      // Dispatch event to force re-render across the app
      window.dispatchEvent(new CustomEvent('google-drive-status-updated'));

      // Check and execute pending action
      const pendingAction = localStorage.getItem('google_drive_pending_action');
      localStorage.removeItem('google_drive_pending_action');

      if (pendingAction === 'backup') {
        setTimeout(() => this.backup(), 500);
      } else if (pendingAction === 'restore') {
        setTimeout(() => this.restore(), 500);
      }
    } catch (err) {
      console.error('[Google Drive] Error fetching profile info:', err);
      toast.error('Failed to sync Google Drive user details.');
    }
  }

  /**
   * Finds or creates the "Buxman_Backups" folder on Google Drive
   */
  async getOrCreateFolder(token: string): Promise<string | null> {
    try {
      const query = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and name='Buxman_Backups' and trashed=false");
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id)`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Folder search failed');
      const data = await response.json();

      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }

      // Create the folder
      toast.info('Creating Buxman_Backups folder on Google Drive...');
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Buxman_Backups',
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Folder for storing Buxman Smart Expense Hub backups'
        })
      });

      if (!createResponse.ok) throw new Error('Folder creation failed');
      const createdFolder = await createResponse.json();
      return createdFolder.id;
    } catch (err) {
      console.error('[Google Drive] Error getting/creating folder:', err);
      return null;
    }
  }

  /**
   * Lists all backup files inside the Buxman_Backups folder
   */
  async listBackups(): Promise<any[] | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const folderId = await this.getOrCreateFolder(token);
      if (!folderId) throw new Error('Could not resolve backups folder ID');

      const query = encodeURIComponent(`'${folderId}' in parents and mimeType='application/json' and name contains 'buxman_backup_' and trashed=false`);
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime+desc&fields=files(id,name,modifiedTime,size)&pageSize=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to query files');
      const data = await response.json();
      return data.files || [];
    } catch (err: any) {
      console.error('[Google Drive] Failed to list backups:', err);
      toast.error('Failed to list backups: ' + (err.message || err));
      return null;
    }
  }

  /**
   * Backs up all application data into Google Drive
   */
  async backup(): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) {
      this.connect('backup');
      return false;
    }

    try {
      toast.info('Syncing backup to Google Drive...');
      
      const folderId = await this.getOrCreateFolder(token);
      if (!folderId) throw new Error('Failed to create or locate "Buxman_Backups" folder.');

      const dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
      const fileName = `buxman_backup_${dateStr}.json`;

      const data = dataMigrationService.exportAllData();
      const jsonData = JSON.stringify(data, null, 2);

      // Create new file inside folder (Multipart upload)
      const boundary = 'buxman_multipart_boundary';
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [folderId],
        description: 'Buxman Smart Expense Hub backup file'
      };

      const body = 
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${jsonData}\r\n` +
        `--${boundary}--`;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: body
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google API returned error: ${response.status} - ${errorText}`);
      }

      const settings = settingsService.get();
      const updated = {
        ...settings,
        googleDriveLastBackup: new Date().toISOString()
      };
      settingsService.save(updated);

      toast.success('Backup uploaded to Google Drive successfully!');
      window.dispatchEvent(new CustomEvent('google-drive-status-updated'));
      return true;
    } catch (err: any) {
      console.error('[Google Drive] Upload failed:', err);
      toast.error('Backup upload failed: ' + (err.message || err));
      return false;
    }
  }

  /**
   * Downloads a specific backup file from Google Drive and places it in pending restore state.
   * If fileId is not specified, fires an event to open the restore list selector in the UI.
   */
  async restore(fileId?: string): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) {
      this.connect('restore');
      return false;
    }

    if (!fileId) {
      window.dispatchEvent(new CustomEvent('google-drive-open-restore-modal'));
      return true;
    }

    try {
      toast.info('Downloading selected backup from Google Drive...');
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Google Drive download failed');
      }

      const content = await response.text();
      if (!content || content.trim() === '') {
        throw new Error('The backup file is empty');
      }

      // Check if valid JSON
      JSON.parse(content);

      // Store in memory temporary and fire ready event
      localStorage.setItem('google_drive_pending_restore_data', content);
      window.dispatchEvent(new CustomEvent('google-drive-restore-ready'));
      return true;
    } catch (err: any) {
      console.error('[Google Drive] Download failed:', err);
      toast.error('Failed to download backup: ' + (err.message || err));
      return false;
    }
  }

  /**
   * Disconnects the user account from Google Drive
   */
  signOut() {
    this.clearSession();
    const settings = settingsService.get();
    const updated = {
      ...settings,
      googleDriveBackupEnabled: false,
      googleDriveLinkedEmail: '',
      googleDriveLastBackup: ''
    };
    settingsService.save(updated);
    toast.success('Disconnected from Google Drive');
    window.dispatchEvent(new CustomEvent('google-drive-status-updated'));
  }

  /**
   * Clear active OAuth tokens
   */
  clearSession() {
    localStorage.removeItem('google_drive_access_token');
    localStorage.removeItem('google_drive_token_expiry');
    localStorage.removeItem('google_drive_pending_action');
    localStorage.removeItem('google_drive_pending_restore_data');
  }
}

export const googleDriveService = new GoogleDriveService();
