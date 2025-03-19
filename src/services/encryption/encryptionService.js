import CryptoJS from 'crypto-js';

class EncryptionService {
  constructor() {
    this.algorithm = 'AES';
    this.keyMap = new Map(); // Store file-specific encryption keys
    this.keyRotationInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    this.keyExpirationTime = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    this.failedAttempts = new Map(); // Track failed password attempts
    this.maxFailedAttempts = 5; // Maximum failed attempts before temporary lockout
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
  }

  // Enhanced key generation with additional entropy
  generateEncryptionKey() {
    const timestamp = new Date().getTime().toString();
    const random1 = CryptoJS.lib.WordArray.random(32);
    const random2 = CryptoJS.lib.WordArray.random(32);
    const combined = CryptoJS.SHA256(random1.concat(random2).concat(CryptoJS.enc.Utf8.parse(timestamp)));
    return combined.toString();
  }

  // Enhanced password-based key generation
  generateKeyFromPassword(password, salt) {
    // Add pepper (server-side secret) - in production, this should be stored securely
    const pepper = "YOUR_SERVER_SIDE_SECRET";
    const peppered = password + pepper;
    
    return CryptoJS.PBKDF2(peppered, salt || CryptoJS.lib.WordArray.random(128/8), {
      keySize: 256/32,
      iterations: 10000 // Increased iterations for better security
    }).toString();
  }

  // Store a file-specific encryption key with expiration
  setFileKey(fileId, key, password = null) {
    const expirationDate = new Date(Date.now() + this.keyExpirationTime);
    const rotationDate = new Date(Date.now() + this.keyRotationInterval);
    
    if (password) {
      const salt = CryptoJS.lib.WordArray.random(128/8);
      const passwordKey = this.generateKeyFromPassword(password, salt);
      const encryptedKey = CryptoJS.AES.encrypt(key, passwordKey).toString();
      
      this.keyMap.set(fileId, {
        key: encryptedKey,
        salt: salt.toString(),
        isPasswordProtected: true,
        createdAt: new Date().toISOString(),
        expiresAt: expirationDate.toISOString(),
        nextRotation: rotationDate.toISOString(),
        version: 1
      });
    } else {
      this.keyMap.set(fileId, {
        key,
        isPasswordProtected: false,
        createdAt: new Date().toISOString(),
        expiresAt: expirationDate.toISOString(),
        nextRotation: rotationDate.toISOString(),
        version: 1
      });
    }
  }

  // Check and handle failed password attempts
  async checkFailedAttempts(fileId) {
    const attempts = this.failedAttempts.get(fileId) || { count: 0, lastAttempt: 0 };
    
    if (attempts.count >= this.maxFailedAttempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      if (timeSinceLastAttempt < this.lockoutDuration) {
        const remainingLockout = Math.ceil((this.lockoutDuration - timeSinceLastAttempt) / 1000 / 60);
        throw new Error(`Account locked. Try again in ${remainingLockout} minutes`);
      } else {
        // Reset attempts after lockout period
        this.failedAttempts.set(fileId, { count: 0, lastAttempt: Date.now() });
      }
    }
  }

  // Record failed password attempt
  recordFailedAttempt(fileId) {
    const attempts = this.failedAttempts.get(fileId) || { count: 0, lastAttempt: 0 };
    this.failedAttempts.set(fileId, {
      count: attempts.count + 1,
      lastAttempt: Date.now()
    });
  }

  // Reset failed attempts
  resetFailedAttempts(fileId) {
    this.failedAttempts.delete(fileId);
  }

  // Get a file-specific encryption key with expiration check
  async getFileKey(fileId, password = null) {
    const keyData = this.keyMap.get(fileId);
    if (!keyData) return null;

    // Check key expiration
    if (new Date(keyData.expiresAt) < new Date()) {
      throw new Error('Encryption key has expired');
    }

    // Check if key rotation is needed
    if (new Date(keyData.nextRotation) < new Date()) {
      await this.rotateKey(fileId);
      return this.getFileKey(fileId, password);
    }

    if (keyData.isPasswordProtected && password) {
      // Check for failed attempts
      await this.checkFailedAttempts(fileId);

      const passwordKey = this.generateKeyFromPassword(password, keyData.salt);
      try {
        const decryptedKey = CryptoJS.AES.decrypt(keyData.key, passwordKey).toString(CryptoJS.enc.Utf8);
        this.resetFailedAttempts(fileId);
        return decryptedKey;
      } catch (error) {
        this.recordFailedAttempt(fileId);
        throw new Error('Incorrect password');
      }
    }

    return keyData.key;
  }

  // Rotate encryption key
  async rotateKey(fileId) {
    const keyData = this.keyMap.get(fileId);
    if (!keyData) throw new Error('No encryption key found for this file');

    const newKey = this.generateEncryptionKey();
    const expirationDate = new Date(Date.now() + this.keyExpirationTime);
    const rotationDate = new Date(Date.now() + this.keyRotationInterval);

    if (keyData.isPasswordProtected) {
      const salt = CryptoJS.lib.WordArray.random(128/8);
      const passwordKey = this.generateKeyFromPassword(keyData.password, salt);
      const encryptedKey = CryptoJS.AES.encrypt(newKey, passwordKey).toString();

      this.keyMap.set(fileId, {
        ...keyData,
        key: encryptedKey,
        salt: salt.toString(),
        expiresAt: expirationDate.toISOString(),
        nextRotation: rotationDate.toISOString(),
        version: (keyData.version || 1) + 1
      });
    } else {
      this.keyMap.set(fileId, {
        ...keyData,
        key: newKey,
        expiresAt: expirationDate.toISOString(),
        nextRotation: rotationDate.toISOString(),
        version: (keyData.version || 1) + 1
      });
    }

    return true;
  }

  // Create a shareable key bundle with expiration
  createKeyBundle(fileId, recipientPublicKey = null, expirationHours = 24) {
    const keyData = this.keyMap.get(fileId);
    if (!keyData) throw new Error('No encryption key found for this file');

    const bundle = {
      fileId,
      key: keyData.key,
      salt: keyData.salt,
      isPasswordProtected: keyData.isPasswordProtected,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (expirationHours * 60 * 60 * 1000)).toISOString(),
      version: keyData.version
    };

    if (recipientPublicKey) {
      // In a real implementation, you would encrypt the bundle with the recipient's public key
      return {
        encryptedBundle: CryptoJS.AES.encrypt(JSON.stringify(bundle), recipientPublicKey).toString(),
        recipientPublicKey,
        expiresAt: bundle.expiresAt
      };
    }

    return bundle;
  }

  // Import a key bundle with validation
  importKeyBundle(bundle, privateKey = null) {
    try {
      let keyData;
      if (privateKey) {
        const decryptedBundle = CryptoJS.AES.decrypt(bundle.encryptedBundle, privateKey).toString(CryptoJS.enc.Utf8);
        keyData = JSON.parse(decryptedBundle);
      } else {
        keyData = bundle;
      }

      // Validate bundle expiration
      if (new Date(keyData.expiresAt) < new Date()) {
        throw new Error('Key bundle has expired');
      }

      // Check if newer version exists
      const existingKey = this.keyMap.get(keyData.fileId);
      if (existingKey && existingKey.version > keyData.version) {
        throw new Error('A newer version of this key already exists');
      }

      this.keyMap.set(keyData.fileId, {
        ...keyData,
        importedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Failed to import key bundle:', error);
      throw error;
    }
  }

  // Get key status information
  getKeyStatus(fileId) {
    const keyData = this.keyMap.get(fileId);
    if (!keyData) return null;

    const now = new Date();
    const expiresAt = new Date(keyData.expiresAt);
    const nextRotation = new Date(keyData.nextRotation);

    return {
      isExpired: expiresAt < now,
      daysUntilExpiration: Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)),
      needsRotation: nextRotation < now,
      daysUntilRotation: Math.ceil((nextRotation - now) / (1000 * 60 * 60 * 24)),
      version: keyData.version,
      isPasswordProtected: keyData.isPasswordProtected,
      createdAt: keyData.createdAt,
      importedAt: keyData.importedAt
    };
  }

  async encryptFile(file, key, password = null, onProgress = null) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

      // Generate a file-specific key if not provided
      const fileKey = key || this.generateEncryptionKey();
      
      // Encrypt the file
      const encrypted = CryptoJS.AES.encrypt(wordArray, fileKey).toString();

      // Store the encryption key
      const fileId = `${file.name}-${Date.now()}`;
      this.setFileKey(fileId, fileKey, password);

      // Create a new Blob with the encrypted data
      const encryptedBlob = new Blob([encrypted], { type: 'application/encrypted' });
      const encryptedFile = new File([encryptedBlob], `${file.name}.encrypted`, {
        type: 'application/encrypted',
        lastModified: new Date()
      });

      return {
        file: encryptedFile,
        fileId,
        originalName: file.name,
        originalType: file.type,
        isPasswordProtected: !!password
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  async decryptFile(encryptedBlob, decryptionKey, originalName, originalType) {
    try {
      console.log('Starting file decryption');
      console.log('Decryption key provided:', decryptionKey);

      if (!decryptionKey) {
        throw new Error('Decryption key is required');
      }

      // Read the encrypted blob as text
      const reader = new FileReader();
      const encryptedText = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(encryptedBlob);
      });

      console.log('Attempting decryption with provided key');
      
      // Decrypt using CryptoJS
      const decrypted = CryptoJS.AES.decrypt(encryptedText, decryptionKey);
      
      // Convert to Uint8Array
      const length = decrypted.sigBytes;
      const words = decrypted.words;
      const uint8Array = new Uint8Array(length);
      
      for (let i = 0; i < length; i++) {
        const wordIndex = i >>> 2;
        const bytePosition = (i % 4) * 8;
        uint8Array[i] = (words[wordIndex] >>> (24 - bytePosition)) & 0xff;
      }

      console.log('Decryption successful');

      // Create a new blob with the decrypted data
      return new Blob([uint8Array], {
        type: originalType || 'application/octet-stream'
      });
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Batch decrypt multiple files
  async batchDecrypt(files, password = null, onProgress = null) {
    const results = [];
    let totalProgress = 0;

    for (const [index, file] of files.entries()) {
      try {
        const decrypted = await this.decryptFile(
          file.data,
          file.fileId,
          password,
          (progress) => {
            if (onProgress) {
              const fileProgress = progress / files.length;
              const overallProgress = (totalProgress + fileProgress);
              onProgress(overallProgress);
            }
          }
        );

        results.push({
          success: true,
          file: decrypted,
          originalName: file.originalName,
          originalType: file.originalType
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          originalName: file.originalName
        });
      }

      totalProgress += (1 / files.length) * 100;
    }

    return results;
  }
}

export const encryptionService = new EncryptionService(); 