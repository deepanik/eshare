import axios from 'axios';
import { encryptionService } from '../encryption/encryptionService';
import { 
  createFileRecord, 
  createEncryptionKey, 
  getEncryptionKeyByFile,
  getFileById,
  getFilePurchases
} from '../supabase/supabaseClient';
import { authService } from '../auth/authService';

class FileService {
  constructor() {
    this.gateway = 'https://gateway.pinata.cloud/ipfs';
    this.dbPath = 'http://localhost:3001/api/db';
    this.localDbAvailable = null; // Cache for local DB availability check

    // Configure axios for Pinata (headers will be set dynamically)
    this.pinata = axios.create({
      baseURL: 'https://api.pinata.cloud'
    });

    // Configure axios for local DB with short timeout to fail fast
    this.localDb = axios.create({
      baseURL: 'http://localhost:3001',
      timeout: 500 // 500ms timeout - fail fast if server isn't running
    });
  }

  // Get Pinata credentials dynamically
  getPinataCredentials() {
    const apiKey = import.meta.env.VITE_PINATA_API_KEY?.trim();
    const secretKey = import.meta.env.VITE_PINATA_SECRET_KEY?.trim();
    
    if (!apiKey || !secretKey || apiKey === '' || secretKey === '') {
      // Only log detailed debug info in development mode
      if (import.meta.env.DEV) {
        const viteEnvVars = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_PINATA'));
        const allViteEnvVars = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'));
        
        console.warn('⚠️ Pinata credentials not configured:', {
          apiKey: apiKey ? 'present' : 'missing',
          secretKey: secretKey ? 'present' : 'missing',
          foundPinataVars: viteEnvVars,
          totalViteVars: allViteEnvVars.length,
          sampleViteVars: allViteEnvVars.slice(0, 5), // Show first 5 as sample
          mode: import.meta.env.MODE,
          dev: import.meta.env.DEV
        });
        
        console.warn('💡 Troubleshooting steps:');
        console.warn('   1. Verify .env file exists in project root');
        console.warn('   2. Check that variables start with VITE_ prefix');
        console.warn('   3. Ensure no spaces around = sign (e.g., VITE_PINATA_API_KEY=value)');
        console.warn('   4. STOP the dev server completely (Ctrl+C)');
        console.warn('   5. Clear Vite cache: Remove-Item -Recurse -Force node_modules\.vite');
        console.warn('   6. RESTART the dev server (npm run dev)');
        console.warn('   7. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)');
        console.warn('   Note: Vite only loads .env variables when the server starts!');
      }
      throw new Error('Pinata API credentials not configured. Please set VITE_PINATA_API_KEY and VITE_PINATA_SECRET_KEY in your .env file and restart the dev server.');
    }
    
    return { apiKey, secretKey };
  }

  // Check if local database server is available (with caching)
  async isLocalDbAvailable() {
    if (this.localDbAvailable !== null) {
      return this.localDbAvailable;
    }

    try {
      // Quick health check with very short timeout
      await this.localDb.get('/api/db', { timeout: 300 });
      this.localDbAvailable = true;
      return true;
    } catch (error) {
      this.localDbAvailable = false;
      return false;
    }
  }

  async getDb() {
    // Skip local DB if we know it's not available (after first check)
    if (this.localDbAvailable === false) {
      return { files: [], keys: [], shares: [] };
    }

    try {
      const response = await this.localDb.get('/api/db');
      this.localDbAvailable = true; // Mark as available on success
      return response.data;
    } catch (error) {
      // Mark as unavailable on connection errors
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || error.code === 'ECONNABORTED') {
        this.localDbAvailable = false;
      }
      // Local database server is optional - silently return empty data if not available
      // The app uses Supabase for primary storage, so connection refused is expected when server isn't running
      return { files: [], keys: [], shares: [] };
    }
  }

  async saveDb(db) {
    // Skip local DB if we know it's not available (after first check)
    if (this.localDbAvailable === false) {
      return false;
    }

    try {
      const response = await this.localDb.post('/api/db', db);
      this.localDbAvailable = true; // Mark as available on success
      if (import.meta.env.DEV) {
      }
      return response.data.success;
    } catch (error) {
      // Mark as unavailable on connection errors
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || error.code === 'ECONNABORTED') {
        this.localDbAvailable = false;
      }
      // Local database server is optional - silently fail if not available
      // The app uses Supabase for primary storage, so connection refused is expected when server isn't running
      return false;
    }
  }

  /**
   * Update file price and owner wallet address in local database
   * @param {string} fileId - IPFS hash (file ID)
   * @param {number} priceUsd - New price in USD
   * @param {string} ownerWalletAddress - Owner's wallet address (optional)
   * @returns {Promise<boolean>} Success status
   */
  async updateFilePrice(fileId, priceUsd, ownerWalletAddress = null) {
    try {
      const db = await this.getDb();
      const fileIndex = db.files.findIndex(f => f.id === fileId);
      
      if (fileIndex === -1) {
        // File doesn't exist in local DB - create a new entry
        
        // Try to get file info from Pinata to populate basic metadata
        let fileInfo = null;
        try {
          const { apiKey, secretKey } = this.getPinataCredentials();
          const pinataResponse = await this.pinata.get('/data/pinList', {
            headers: {
              'pinata_api_key': apiKey,
              'pinata_secret_api_key': secretKey
            },
            params: {
              status: 'pinned',
              hashContains: fileId
            }
          });
          
          if (pinataResponse.data.rows && pinataResponse.data.rows.length > 0) {
            fileInfo = pinataResponse.data.rows[0];
          }
        } catch (pinataError) {
          console.debug('Could not fetch file info from Pinata:', pinataError);
        }
        
        // Get current user for owner_id
        let ownerId = null;
        try {
          const { authService } = await import('../auth/authService');
          const currentUser = await authService.getCurrentUser();
          ownerId = currentUser?.id || null;
        } catch (authError) {
          console.debug('Could not get current user:', authError);
        }
        
        // Get wallet address if not provided
        if (!ownerWalletAddress) {
          try {
            const { walletConnectionService } = await import('../wallet/walletConnectionService');
            const walletInfo = walletConnectionService.getConnectionData();
            if (walletInfo.isConnected && walletInfo.address) {
              ownerWalletAddress = walletInfo.address;
            }
          } catch (walletError) {
            console.debug('Could not get wallet address:', walletError);
          }
        }
        
        // Parse metadata if available
        let metadata = {};
        if (fileInfo?.metadata?.keyvalues?.encryptedMetadata) {
          try {
            metadata = JSON.parse(fileInfo.metadata.keyvalues.encryptedMetadata);
          } catch (parseError) {
            console.debug('Could not parse metadata:', parseError);
          }
        }
        
        // Create new file entry
        const newFileEntry = {
          id: fileId,
          name: metadata?.originalName || fileInfo?.metadata?.name || fileId,
          uploadDate: fileInfo?.date_pinned ? new Date(fileInfo.date_pinned).toISOString() : new Date().toISOString(),
          encrypted: !!metadata?.encrypted,
          metadata: metadata,
          priceUsd: priceUsd,
          ownerId: ownerId,
          ownerWalletAddress: ownerWalletAddress
        };
        
        db.files.push(newFileEntry);
      } else {
        // Update existing entry
        db.files[fileIndex].priceUsd = priceUsd;
        
        // Update wallet address if provided
        if (ownerWalletAddress) {
          db.files[fileIndex].ownerWalletAddress = ownerWalletAddress;
        } else if (!db.files[fileIndex].ownerWalletAddress) {
          // Try to get current wallet address if not set
          try {
            const { walletConnectionService } = await import('../wallet/walletConnectionService');
            const walletInfo = walletConnectionService.getConnectionData();
            if (walletInfo.isConnected && walletInfo.address) {
              db.files[fileIndex].ownerWalletAddress = walletInfo.address;
            }
          } catch (walletError) {
            console.debug('Could not get wallet address for update:', walletError);
          }
        }
        
      }

      await this.saveDb(db);
      return true;
    } catch (error) {
      console.error('Error updating file price:', error);
      return false;
    }
  }

  async uploadToIPFS(file, encryptionOptions = null) {
    try {

      let fileToUpload = file;
      let encryptedMetadata = null;
      let encryptionKey = null;

      // Handle encryption if enabled
      if (encryptionOptions?.useEncryption) {
        // Generate encryption key
        encryptionKey = await encryptionService.generateEncryptionKey();
        
        // Encrypt the file
        const encryptedFile = await encryptionService.encryptFile(file, encryptionKey);
        fileToUpload = encryptedFile.file;
        
        // Create encrypted metadata
        encryptedMetadata = {
          encrypted: true,
          originalName: file.name,
          originalType: file.type,
          isPasswordProtected: !!encryptionOptions.password,
          // Only store password verification data, never the password itself
          passwordVerifier: encryptionOptions.password ? 
            await encryptionService.generatePasswordVerifier(encryptionOptions.password) : null
        };
      }

      // Upload to IPFS
      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      // Add metadata
      const metadata = {
        name: encryptedMetadata ? `${file.name}.encrypted` : file.name,
        keyvalues: {
          type: encryptedMetadata ? 'application/encrypted' : file.type,
          size: String(fileToUpload.size),
          lastModified: String(file.lastModified),
          encryptedMetadata: encryptedMetadata ? JSON.stringify(encryptedMetadata) : ''
        }
      };
      formData.append('pinataMetadata', JSON.stringify(metadata));

      // Upload to IPFS
      const { apiKey, secretKey } = this.getPinataCredentials();
      
      const response = await this.pinata.post('/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': `multipart/form-data`,
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secretKey
        },
        maxContentLength: Infinity
      });

      // Get current user for owner_id
      const currentUser = await authService.getCurrentUser();
      const ownerId = currentUser?.id || null;
      const priceUsd = encryptionOptions?.priceUsd || 0;
      
      // Get owner's wallet address if available
      let ownerWalletAddress = null;
      try {
        const { walletConnectionService } = await import('../wallet/walletConnectionService');
        const walletInfo = walletConnectionService.getConnectionData();
        if (walletInfo.isConnected && walletInfo.address) {
          ownerWalletAddress = walletInfo.address;
        }
      } catch (walletError) {
        console.debug('Could not get owner wallet address:', walletError);
      }

      // Save to local database (primary storage for encryption keys)
      const db = await this.getDb();
      const fileEntry = {
        id: response.data.IpfsHash,
        name: file.name,
        uploadDate: new Date().toISOString(),
        encrypted: !!encryptedMetadata,
        metadata: encryptedMetadata,
        priceUsd: priceUsd, // Store price in local DB
        ownerId: ownerId, // Store owner in local DB
        ownerWalletAddress: ownerWalletAddress // Store owner's wallet address for payments
      };
      
      // Store encryption key in local database if encrypted
      if (encryptionKey) {
        fileEntry.encryptionKey = encryptionKey;
      }
      
      db.files.push(fileEntry);
      await this.saveDb(db);

      // Store encryption key in Supabase if encrypted
      // Note: If encryption_keys table has file_id as UUID type, you'll need to either:
      // 1. Change the table schema to use TEXT for file_id, OR
      // 2. Create a files table entry first with a UUID and use that UUID
      if (encryptionKey && ownerId) {
        try {
          // Try storing with IPFS hash as file_id (works if column is TEXT)
          // If column is UUID, this will fail and we'll fall back to local storage
          const keyResult = await createEncryptionKey({
            file_id: response.data.IpfsHash, // IPFS hash (string)
            owner_id: ownerId,
            encryption_key: encryptionKey,
            created_at: new Date().toISOString()
          });
          
          if (keyResult.error) {
            // Check if it's a UUID type error
            if (keyResult.error.code === '22P02' || keyResult.error.message?.includes('invalid input syntax for type uuid')) {
              console.warn('⚠️ Supabase encryption_keys.file_id is UUID type, but we use IPFS hashes (strings).');
              console.warn('💡 To fix this, change the encryption_keys table schema:');
              console.warn('   ALTER TABLE encryption_keys ALTER COLUMN file_id TYPE TEXT;');
              console.warn('   Or create a files table entry with UUID and use that UUID instead.');
              // Continue - key is stored locally anyway
            } else if (keyResult.error.code !== 'PGRST204' && 
                       keyResult.error.code !== '42P01' && 
                       keyResult.error.code !== 'PGRST116') {
              // Log other unexpected errors
              if (import.meta.env.DEV) {
                console.warn('Error storing encryption key in Supabase:', keyResult.error);
              }
            }
          } else {
          }
        } catch (keyError) {
          // Silently handle - key is stored locally anyway
          if (import.meta.env.DEV) {
            console.debug('Supabase encryption key storage failed (using local storage):', keyError.message);
          }
        }
      }

      return {
        ipfsHash: response.data.IpfsHash,
        metadata: encryptedMetadata,
        encryptionKey: encryptionKey, // Return the key to be shown to the user
        priceUsd: priceUsd
      };
    } catch (error) {
      console.error('Failed to upload to IPFS:', error.response?.data || error);
      throw error;
    }
  }

  async downloadFile(fileId, storageType, downloadOptions) {
    try {
      
      // Get file metadata from Pinata with more specific query
      const { apiKey, secretKey } = this.getPinataCredentials();
      
      const pinataResponse = await this.pinata.get('/data/pinList', {
        headers: {
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secretKey
        },
        params: {
          status: 'pinned',
          metadata: JSON.stringify({
            keyvalues: {
              fileId: { value: fileId, op: 'eq' }
            }
          })
        }
      });
      
      // Try to find the file by either IPFS hash or fileId in metadata
      const pinataFile = pinataResponse.data.rows.find(item => 
        item.ipfs_pin_hash === fileId || 
        item.metadata?.keyvalues?.fileId === fileId
      );
      
      if (!pinataFile) {
        console.error('File not found in Pinata:', fileId);
        throw new Error('File not found on IPFS');
      }

      // Get the actual IPFS hash
      const ipfsHash = pinataFile.ipfs_pin_hash;

      // Parse metadata
      const pinataMetadata = pinataFile.metadata?.keyvalues?.encryptedMetadata
        ? JSON.parse(pinataFile.metadata.keyvalues.encryptedMetadata)
        : null;


      // Get additional metadata from database
      const db = await this.getDb();
      const dbFile = db.files.find(f => f.id === ipfsHash || f.id === fileId);

      if (!dbFile) {
        console.error('File not found in local database:', fileId);
      }

      // Combine metadata
      const fileData = {
        id: ipfsHash,
        name: pinataMetadata?.originalName || pinataFile.metadata?.name || ipfsHash,
        type: pinataMetadata?.originalType || pinataFile.metadata?.keyvalues?.type || 'application/octet-stream',
        encrypted: !!pinataMetadata?.encrypted,
        metadata: {
          ...(pinataMetadata || {}),
          ...(dbFile?.metadata || {})
        }
      };


      // Download file from IPFS using Pinata gateway
      console.log('Downloading from IPFS:', ipfsHash);
      const downloadResponse = await fetch(`${this.gateway}/${ipfsHash}`);

      if (!downloadResponse.ok) {
        console.error('IPFS download failed:', downloadResponse.status, downloadResponse.statusText);
        throw new Error('Failed to download file from IPFS');
      }

      const blob = await downloadResponse.blob();
      
      // Decrypt if necessary
      if (fileData.encrypted) {
        
        // Check if decryption key is provided
        if (!downloadOptions.decryptionKey) {
          throw new Error('Decryption key required for this file');
        }

        // Verify password if required
        if (fileData.metadata.isPasswordProtected) {
          if (!downloadOptions.password) {
            throw new Error('Password required to decrypt this file');
          }
          const isPasswordValid = await encryptionService.verifyPassword(
            downloadOptions.password,
            fileData.metadata.passwordVerifier
          );
          if (!isPasswordValid) {
            throw new Error('Incorrect password');
          }
        }

        try {
          const decryptedFile = await encryptionService.decryptFile(
            blob,
            downloadOptions.decryptionKey,
            downloadOptions.password || null
          );
          
          // Validate that decryption actually produced data
          if (!decryptedFile || decryptedFile.size === 0) {
            throw new Error('Decryption produced empty result. Invalid key.');
          }
          
          
          // Create a new blob with the correct file name and type
          const finalBlob = new Blob([decryptedFile], { 
            type: fileData.type || 'application/octet-stream' 
          });
          
          return finalBlob;
        } catch (error) {
          console.error('Decryption failed:', error);
          // Provide more specific error messages
          if (error.message?.includes('sigBytes') || 
              error.message?.includes('Cannot read properties') ||
              error.message?.includes('WordArray') ||
              error.message?.includes('empty result')) {
            throw new Error('Invalid decryption key. The key is incorrect or corrupted.');
          } else {
            throw new Error(`Decryption failed: ${error.message || 'Invalid key or corrupted data'}`);
          }
        }
      }

      return blob;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  async listFiles() {
    try {
      // Check credentials first and return empty array if not configured
      let credentials;
      try {
        credentials = this.getPinataCredentials();
      } catch (error) {
        // Silently return empty array if credentials are missing (already logged in getPinataCredentials)
        return [];
      }
      
      const { apiKey, secretKey } = credentials;
      
      const response = await this.pinata.get('/data/pinList?status=pinned', {
        headers: {
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secretKey
        }
      });
      
      // Get local metadata from database
      const db = await this.getDb();
      
      return response.data.rows.map(item => {
        // Parse metadata from Pinata
        const pinataMetadata = item.metadata?.keyvalues?.encryptedMetadata
          ? JSON.parse(item.metadata.keyvalues.encryptedMetadata)
          : null;

        // Find additional metadata from our database
        const dbFile = db.files.find(f => f.id === item.ipfs_pin_hash);

        // Combine metadata from both sources
        const combinedMetadata = {
          ...(pinataMetadata || {}),
          ...(dbFile?.metadata || {}),
          fileId: item.ipfs_pin_hash,
          originalName: pinataMetadata?.originalName || item.metadata?.name || item.ipfs_pin_hash,
          originalType: pinataMetadata?.originalType || item.metadata?.keyvalues?.type || 'application/octet-stream'
        };

        return {
          id: item.ipfs_pin_hash,
          name: combinedMetadata.originalName,
          size: item.size,
          type: combinedMetadata.originalType,
          uploadDate: new Date(item.date_pinned),
          storageType: 'IPFS',
          encrypted: !!pinataMetadata?.encrypted,
          isPasswordProtected: !!pinataMetadata?.isPasswordProtected,
          metadata: combinedMetadata,
          priceUsd: dbFile?.priceUsd || 0, // Include price from local DB
          price_usd: dbFile?.priceUsd || 0, // Also include snake_case for compatibility
          ownerId: dbFile?.ownerId || null, // Include owner ID
          ownerWalletAddress: dbFile?.ownerWalletAddress || null // Include owner wallet address
        };
      });
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Get encryption key for a file
   * @param {string} fileId - The file ID (IPFS hash)
   * @param {string} userId - The user ID (to verify ownership or purchase)
   * @returns {Promise<{key: string|null, canAccess: boolean, reason: string}>}
   */
  async getEncryptionKey(fileId, userId) {
    try {
      if (!userId) {
        return { key: null, canAccess: false, reason: 'User not authenticated' };
      }

      // First, try to get key from local DB (most reliable)
      try {
        const db = await this.getDb();
        const fileEntry = db.files.find(f => f.id === fileId);
        if (fileEntry?.encryptionKey) {
          return { 
            key: fileEntry.encryptionKey, 
            canAccess: true, 
            reason: 'Key retrieved from local storage' 
          };
        }
      } catch (localError) {
        console.warn('Local DB access failed, trying Supabase:', localError);
      }

      // Check if user is owner or has purchased the file (for paid files)
      let isOwner = false;
      let price = 0;
      let hasPurchased = false;
      
      // Try to get price and ownership from local DB first (more reliable)
      try {
        const db = await this.getDb();
        const dbFile = db.files.find(f => f.id === fileId);
        if (dbFile) {
          price = dbFile.priceUsd || 0;
          // Check if current user is owner
          const currentUser = await authService.getCurrentUser();
          if (currentUser && dbFile.ownerId === currentUser.id) {
            isOwner = true;
          }
        }
      } catch (localDbError) {
        // Silently continue
      }
      
      // Also try Supabase (optional - may fail due to schema mismatch)
      try {
        const { getFileById } = await import('../supabase/supabaseClient');
        const { getFilePurchases } = await import('../supabase/supabaseClient');
        
        // Check file ownership and price from Supabase
        const { data: fileData } = await getFileById(fileId);
        if (fileData && !fileData.error) {
          isOwner = fileData.owner_id === userId;
          // Use Supabase price if local DB doesn't have it
          if (price === 0) {
            price = fileData.price_usd || 0;
          }
        }
        
        // Check if user has purchased the file (only if not owner and file is paid)
        if (!isOwner && price > 0) {
          const { data: purchases } = await getFilePurchases(fileId);
          hasPurchased = purchases?.some(p => p.buyer_id === userId) || false;
        }
      } catch (checkError) {
        // Silently continue - Supabase might not be available or schema doesn't match
        // This is expected and handled gracefully
      }

      // Try Supabase key retrieval (if table schema supports IPFS hashes as file_id)
      // For paid files, only return key if user is owner or has purchased
      try {
        const { data: keyData, error } = await getEncryptionKeyByFile(fileId, userId);
        
        // If we got the key successfully, return it
        if (!error && keyData?.encryption_key) {
          // For paid files, verify access
          if (price > 0 && !isOwner && !hasPurchased) {
            return { 
              key: null, 
              canAccess: false, 
              reason: 'File must be purchased first to access the decryption key' 
            };
          }
          
          return { 
            key: keyData.encryption_key, 
            canAccess: true, 
            reason: isOwner ? 'You are the file owner' : hasPurchased ? 'You have purchased this file' : 'Free file'
          };
        }
        
        // If error is UUID-related, skip Supabase (schema mismatch)
        if (error && (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid'))) {
          // Schema mismatch - file_id is UUID but we use IPFS hash strings
          // Silently continue to local storage
        }
      } catch (supabaseError) {
        // Supabase query failed, fall back to local storage
        // Silently continue - this is expected if schema doesn't match
      }
      
      // For paid files, check access before returning local key
      if (price > 0 && !isOwner && !hasPurchased) {
        return { 
          key: null, 
          canAccess: false, 
          reason: 'File must be purchased first to access the decryption key' 
        };
      }

      // Final fallback: check local DB again
      try {
        const db = await this.getDb();
        const fileEntry = db.files.find(f => f.id === fileId);
        const key = fileEntry?.encryptionKey || null;
        return { 
          key, 
          canAccess: !!key, 
          reason: key ? 'Key retrieved from local storage' : 'Key not found. The file may not have been uploaded with encryption, or the key was not saved.' 
        };
      } catch (dbError) {
        console.error('Error accessing local DB for encryption key:', dbError);
        return { 
          key: null, 
          canAccess: false, 
          reason: 'Unable to access key storage. Please ensure the file was uploaded with encryption enabled.' 
        };
      }
    } catch (error) {
      console.error('Error getting encryption key:', error);
      return { 
        key: null, 
        canAccess: false, 
        reason: 'An error occurred while retrieving the encryption key. Please try again.' 
      };
    }
  }

  async deleteFile(fileId, storageType = 'IPFS') {
    try {
      if (!fileId) {
        throw new Error('File ID is required');
      }

      // Default to IPFS if no storage type is provided
      const storage = (storageType || 'IPFS').toUpperCase();
      
      if (storage === 'IPFS') {
        // Try to unpin from Pinata
        try {
          const { apiKey, secretKey } = this.getPinataCredentials();
          
          await this.pinata.delete(`/pinning/unpin/${fileId}`, {
            headers: {
              'pinata_api_key': apiKey,
              'pinata_secret_api_key': secretKey
            }
          });
          
        } catch (pinataError) {
          // If unpinning fails, log but continue with local deletion
          console.warn('Failed to unpin from Pinata (file may already be deleted):', pinataError.message);
        }
        
        // Remove from local database
        try {
          const db = await this.getDb();
          db.files = db.files.filter(f => f.id !== fileId);
          await this.saveDb(db);
        } catch (dbError) {
          console.warn('Failed to remove from local database:', dbError.message);
        }

        // Try to remove from Supabase (optional)
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            const { deleteFileRecord } = await import('../supabase/supabaseClient');
            await deleteFileRecord(fileId, currentUser.id);
          }
        } catch (supabaseError) {
          // Supabase deletion is optional - continue even if it fails
          console.debug('Supabase deletion failed (optional):', supabaseError.message);
        }
      } else {
        throw new Error(`Unsupported storage type: ${storage}`);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }
}

export const fileService = new FileService(); 