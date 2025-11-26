import CryptoJS from 'crypto-js';

/**
 * Encryption Service
 * Handles file encryption/decryption using AES encryption
 */
class EncryptionService {
  /**
   * Generate a random encryption key
   * @returns {Promise<string>} Base64 encoded encryption key
   */
  async generateEncryptionKey() {
    // Generate a random 256-bit key
    const key = CryptoJS.lib.WordArray.random(256 / 8);
    return CryptoJS.enc.Base64.stringify(key);
  }

  /**
   * Encrypt a file using AES encryption
   * @param {File} file - The file to encrypt
   * @param {string} encryptionKey - Base64 encoded encryption key
   * @param {string} password - Optional password for additional security
   * @returns {Promise<{file: Blob, metadata: Object}>}
   */
  async encryptFile(file, encryptionKey, password = null) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const fileData = event.target.result;
          
          // Derive key from password if provided
          let key = encryptionKey;
          if (password) {
            // Use PBKDF2 to derive key from password
            const salt = CryptoJS.lib.WordArray.random(128 / 8);
            const keyDerived = CryptoJS.PBKDF2(password, salt, {
              keySize: 256 / 32,
              iterations: 10000
            });
            // Combine derived key with encryption key
            key = CryptoJS.enc.Base64.stringify(
              CryptoJS.lib.WordArray.concat(
                CryptoJS.enc.Base64.parse(encryptionKey),
                keyDerived
              )
            );
          }

          // Encrypt the file data
          const encrypted = CryptoJS.AES.encrypt(
            CryptoJS.lib.WordArray.create(fileData),
            key
          ).toString();

          // Convert encrypted string to Blob
          const encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' });

          // Create encrypted file with original name
          const encryptedFile = new File(
            [encryptedBlob],
            file.name,
            { type: 'application/encrypted' }
          );

          resolve({
            file: encryptedFile,
            metadata: {
              originalName: file.name,
              originalType: file.type,
              originalSize: file.size,
              encryptedSize: encryptedFile.size,
              hasPassword: !!password
            }
          });
        } catch (error) {
          reject(new Error(`Encryption failed: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file for encryption'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Decrypt a file using AES decryption
   * @param {Blob} encryptedBlob - The encrypted file blob
   * @param {string} encryptionKey - Base64 encoded encryption key
   * @param {string} password - Optional password if file was password-protected
   * @returns {Promise<Blob>} Decrypted file blob
   */
  async decryptFile(encryptedBlob, encryptionKey, password = null) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const encryptedData = event.target.result;
          const encryptedString = new TextDecoder().decode(encryptedData);

          // Derive key from password if provided
          let key = encryptionKey;
          if (password) {
            // Use PBKDF2 to derive key from password
            const salt = CryptoJS.lib.WordArray.random(128 / 8);
            const keyDerived = CryptoJS.PBKDF2(password, salt, {
              keySize: 256 / 32,
              iterations: 10000
            });
            // Combine derived key with encryption key
            key = CryptoJS.enc.Base64.stringify(
              CryptoJS.lib.WordArray.concat(
                CryptoJS.enc.Base64.parse(encryptionKey),
                keyDerived
              )
            );
          }

          // Decrypt the data
          const decrypted = CryptoJS.AES.decrypt(encryptedString, key);
          
          // Check if decryption was successful
          if (!decrypted || decrypted.sigBytes === 0) {
            throw new Error('Decryption failed. Invalid key, password, or corrupted data.');
          }

          // Convert WordArray to ArrayBuffer
          const decryptedArrayBuffer = this.wordArrayToArrayBuffer(decrypted);

          if (!decryptedArrayBuffer || decryptedArrayBuffer.byteLength === 0) {
            throw new Error('Decryption failed. Invalid key or corrupted data.');
          }

          // Create blob from decrypted data
          const decryptedBlob = new Blob([decryptedArrayBuffer]);
          resolve(decryptedBlob);
        } catch (error) {
          reject(new Error(`Decryption failed: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read encrypted file'));
      };

      reader.readAsArrayBuffer(encryptedBlob);
    });
  }

  /**
   * Convert CryptoJS WordArray to ArrayBuffer
   * @param {CryptoJS.lib.WordArray} wordArray - The word array to convert
   * @returns {ArrayBuffer}
   */
  wordArrayToArrayBuffer(wordArray) {
    if (!wordArray || !wordArray.words) {
      throw new Error('Invalid word array: words property is missing');
    }

    const arrayOfWords = wordArray.words || [];
    const sigBytes = wordArray.sigBytes || 0;
    
    if (sigBytes === 0 || arrayOfWords.length === 0) {
      throw new Error('Empty word array: decryption may have failed');
    }

    // Create Uint8Array with the correct length
    const uInt8Array = new Uint8Array(sigBytes);
    let index = 0;

    // Iterate through words and extract bytes
    for (let i = 0; i < arrayOfWords.length && index < sigBytes; i++) {
      const word = arrayOfWords[i];
      if (word === undefined || word === null) {
        throw new Error(`Invalid word at index ${i}`);
      }
      
      // Extract 4 bytes from each word (32-bit word = 4 bytes)
      uInt8Array[index++] = (word >>> 24) & 0xff;
      if (index >= sigBytes) break;
      
      uInt8Array[index++] = (word >>> 16) & 0xff;
      if (index >= sigBytes) break;
      
      uInt8Array[index++] = (word >>> 8) & 0xff;
      if (index >= sigBytes) break;
      
      uInt8Array[index++] = word & 0xff;
      if (index >= sigBytes) break;
    }

    return uInt8Array.buffer;
  }

  /**
   * Generate a password verifier (hash) for password verification
   * @param {string} password - The password to create a verifier for
   * @returns {Promise<string>} Base64 encoded password hash
   */
  async generatePasswordVerifier(password) {
    // Create a hash of the password for verification
    // Never store the actual password
    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    const hash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000
    });

    return CryptoJS.enc.Base64.stringify(
      CryptoJS.lib.WordArray.concat(salt, hash)
    );
  }

  /**
   * Verify a password against a password verifier
   * @param {string} password - The password to verify
   * @param {string} verifier - The password verifier to check against
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, verifier) {
    try {
      const verifierData = CryptoJS.enc.Base64.parse(verifier);
      const salt = CryptoJS.lib.WordArray.create(
        verifierData.words.slice(0, 4)
      );
      const storedHash = CryptoJS.lib.WordArray.create(
        verifierData.words.slice(4)
      );

      const computedHash = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000
      });

      return storedHash.toString() === computedHash.toString();
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
export default encryptionService;
