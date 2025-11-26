import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        Welcome to eShare
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
        Decentralized file sharing powered by blockchain technology
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Secure Upload
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Upload your files securely to IPFS with end-to-end encryption
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Controlled Access
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Set download limits and expiry dates for your shared files
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Decentralized Storage
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Your files are stored on IPFS, ensuring high availability and redundancy
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          Ready to share your files?
        </p>
        <Link
          to="/upload"
          className="inline-block bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md text-lg font-medium"
        >
          Upload Files
        </Link>
      </div>
    </div>
  );
} 