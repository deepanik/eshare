import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { pinataService } from '../utils/pinataService';

export default function Files() {
  const { active, account } = useWeb3();
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!active || !account) return;

      try {
        setIsLoading(true);
        setError(null);

        // TODO: Implement fetching files from smart contract
        // For now, we'll use mock data
        const mockFiles = [
          {
            name: 'example.pdf',
            size: 1024 * 1024, // 1MB
            uploadDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            downloadLimit: 5,
            downloadsRemaining: 3,
            fileHash: 'QmExample',
          },
          // Add more mock files as needed
        ];

        setFiles(mockFiles);
      } catch (error) {
        console.error('Error fetching files:', error);
        setError('Failed to fetch files. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [active, account]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (file) => {
    const now = new Date();
    const expiryDate = new Date(file.expiryDate);
    const isExpired = now > expiryDate;
    const hasDownloadsLeft = file.downloadsRemaining > 0;

    if (isExpired) return 'text-red-500';
    if (!hasDownloadsLeft) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (!active) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please connect your wallet to view your files
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-300">Loading your files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        My Files
      </h2>

      {files.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">
            You haven't uploaded any files yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {file.name}
                </h3>
                <span className={`text-sm font-medium ${getStatusColor(file)}`}>
                  {new Date(file.expiryDate) < new Date()
                    ? 'Expired'
                    : file.downloadsRemaining === 0
                    ? 'No Downloads Left'
                    : 'Active'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p>Size: {formatFileSize(file.size)}</p>
                <p>Uploaded: {formatDate(file.uploadDate)}</p>
                <p>Expires: {formatDate(file.expiryDate)}</p>
                <p>
                  Downloads: {file.downloadsRemaining} / {file.downloadLimit}
                </p>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    // TODO: Implement download functionality
                    console.log('Download file:', file.fileHash);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Download
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement share functionality
                    console.log('Share file:', file.fileHash);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 