import React, { useState } from 'react';
import { pinataService } from '../utils/pinataService';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [downloadLimit, setDownloadLimit] = useState(1);
  const [expiryDays, setExpiryDays] = useState(7);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Upload file to Pinata
      const fileHash = await pinataService.uploadFile(file);

      // Create metadata
      const metadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        uploader: 'user', // This will be replaced with actual user ID
        downloadLimit,
        expiryDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
        fileHash,
      };

      // Upload metadata to Pinata
      const metadataHash = await pinataService.uploadJSON(metadata);

      setUploadSuccess(true);
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      // Provide more helpful error messages
      if (error.message?.includes('Pinata API keys not configured')) {
        setUploadError('Pinata credentials not configured. Please set VITE_PINATA_API_KEY and VITE_PINATA_SECRET_KEY in your .env file and restart the dev server.');
      } else if (error.message?.includes('Network')) {
        setUploadError('Network error. Please check your internet connection and try again.');
      } else {
        setUploadError(error.message || 'Failed to upload file. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        Upload File
      </h2>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Download Limit
            </label>
            <input
              type="number"
              min="1"
              value={downloadLimit}
              onChange={(e) => setDownloadLimit(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiry (Days)
            </label>
            <input
              type="number"
              min="1"
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {uploadError && (
            <div className="text-red-500 text-sm">{uploadError}</div>
          )}

          {uploadSuccess && (
            <div className="text-green-500 text-sm">
              File uploaded successfully!
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading || !file}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isUploading || !file
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
    </div>
  );
} 