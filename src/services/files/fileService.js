import axios from 'axios';
import { encryptionService } from '../encryption/encryptionService';

class FileService {
  constructor() {
    this.apiKey = import.meta.env.VITE_PINATA_API_KEY;
    this.secretKey = import.meta.env.VITE_PINATA_SECRET_KEY;
    this.gateway = 'https://gateway.pinata.cloud/ipfs';
    this.dbPath = 'http://localhost:3001/api/db';

    // Configure axios for Pinata
    this.pinata = axios.create({
      baseURL: 'https://api.pinata.cloud',
      headers: {
        'pinata_api_key': this.apiKey,
        'pinata_secret_api_key': this.secretKey
      }
    });
  }

  async getDb() {
    try {
      const response = await axios.get(this.dbPath);
      return response.data;
    } catch (error) {
      console.error('Failed to read database:', error);
      return { files: [], keys: [], shares: [] };
    }
  }

  async saveDb(db) {
    try {
      const response = await axios.post(this.dbPath, db);
      console.log('Database saved successfully:', db);
      return response.data.success;
    } catch (error) {
      console.error('Failed to save database:', error);
      return false;
    }
  }

  async uploadToIPFS(file, encryptionOptions = null) {
    try {
      console.log('Starting file upload to IPFS...', file.name);
      console.log('Encryption options:', encryptionOptions);

      let fileToUpload = file;
      let encryptedMetadata = null;
      let encryptionKey = null;

      // Handle encryption if enabled
      if (encryptionOptions?.useEncryption) {
        // Generate encryption key
        encryptionKey = await encryptionService.generateEncryptionKey();
        
        console.log('Encrypting file...', file.name);
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
        console.log('File encrypted successfully');
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
      const response = await this.pinata.post('/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': `multipart/form-data`
        },
        maxContentLength: Infinity
      });

      // Save to database
      const db = await this.getDb();
      const fileEntry = {
        id: response.data.IpfsHash,
        name: file.name,
        uploadDate: new Date().toISOString(),
        encrypted: !!encryptedMetadata,
        metadata: encryptedMetadata
      };
      
      db.files.push(fileEntry);

      if (encryptionKey) {
        // Return the encryption key to the user instead of storing it
        fileEntry.encryptionKey = encryptionKey;
      }

      await this.saveDb(db);

      return {
        ipfsHash: response.data.IpfsHash,
        metadata: encryptedMetadata,
        encryptionKey: encryptionKey // Return the key to be shown to the user
      };
    } catch (error) {
      console.error('Failed to upload to IPFS:', error.response?.data || error);
      throw error;
    }
  }

  async downloadFile(fileId, storageType, downloadOptions) {
    try {
      console.log('Starting download for file:', fileId);
      console.log('Download options:', { ...downloadOptions, password: downloadOptions.password ? '***' : undefined });
      
      // Get file metadata from Pinata with more specific query
      const pinataResponse = await this.pinata.get('/data/pinList', {
        params: {
          status: 'pinned',
          metadata: JSON.stringify({
            keyvalues: {
              fileId: { value: fileId, op: 'eq' }
            }
          })
        }
      });
      
      console.log('Pinata response:', pinataResponse.data);
      
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

      console.log('Pinata metadata:', pinataMetadata);

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

      console.log('Combined file data:', { ...fileData, metadata: { ...fileData.metadata, passwordVerifier: '***' } });

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
        console.log('File is encrypted, attempting decryption');
        
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

        console.log('Decrypting file with provided key...');
        try {
          const decryptedFile = await encryptionService.decryptFile(
            blob,
            downloadOptions.decryptionKey,
            fileData.name,
            fileData.type
          );
          console.log('File decrypted successfully');
          return decryptedFile;
        } catch (error) {
          console.error('Decryption failed:', error);
          throw new Error(`Decryption failed: ${error.message}`);
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
      console.log('Fetching files from Pinata...');
      const response = await this.pinata.get('/data/pinList?status=pinned');
      console.log('Pinata response:', response.data);
      
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
          metadata: combinedMetadata
        };
      });
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
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
        await this.pinata.delete(`/pinning/unpin/${fileId}`);
        
        // Remove from database
        const db = await this.getDb();
        db.files = db.files.filter(f => f.id !== fileId);
        await this.saveDb(db);
        
        console.log('File unpinned from IPFS:', fileId);
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