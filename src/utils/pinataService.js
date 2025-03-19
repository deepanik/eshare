import axios from 'axios';

const PINATA_API_KEY = process.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.VITE_PINATA_SECRET_KEY;

const pinataApiUrl = 'https://api.pinata.cloud';

export const pinataService = {
  async uploadFile(file) {
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
}; 