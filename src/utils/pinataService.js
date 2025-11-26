import axios from 'axios';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;

const pinataApiUrl = 'https://api.pinata.cloud';

// Check if Pinata is configured
const isPinataConfigured = () => {
  const apiKey = PINATA_API_KEY?.trim();
  const secretKey = PINATA_SECRET_KEY?.trim();
  
  return apiKey && secretKey && 
         apiKey !== '' && secretKey !== '' &&
         apiKey !== 'your_pinata_api_key' && 
         secretKey !== 'your_pinata_secret_key';
};

export const pinataService = {
  async uploadFile(file) {
    if (!isPinataConfigured()) {
      if (import.meta.env.DEV) {
        const allViteVars = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'));
        console.error('❌ Pinata not configured. Total VITE_ vars:', allViteVars.length);
        console.error('   Solution: Restart dev server after setting .env variables');
      }
      throw new Error('Pinata API keys not configured. Please set VITE_PINATA_API_KEY and VITE_PINATA_SECRET_KEY in your .env file and restart the dev server.');
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${pinataApiUrl}/pinning/pinFileToIPFS`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      });

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading file to Pinata:', error);
      throw error;
    }
  },

  async uploadJSON(metadata) {
    if (!isPinataConfigured()) {
      throw new Error('Pinata API keys not configured. Please set VITE_PINATA_API_KEY and VITE_PINATA_SECRET_KEY in your .env file.');
    }
    
    try {
      const response = await axios.post(
        `${pinataApiUrl}/pinning/pinJSONToIPFS`,
        metadata,
        {
          headers: {
            'Content-Type': 'application/json',
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
          },
        }
      );

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading metadata to Pinata:', error);
      throw error;
    }
  },

  getFileUrl(ipfsHash) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  },

  async unpinFile(ipfsHash) {
    if (!isPinataConfigured()) {
      throw new Error('Pinata API keys not configured. Please set VITE_PINATA_API_KEY and VITE_PINATA_SECRET_KEY in your .env file.');
    }
    
    try {
      const response = await axios.delete(`${pinataApiUrl}/pinning/unpin/${ipfsHash}`, {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error unpinning file from Pinata:', error);
      throw error;
    }
  },
}; 