/**
 * Network utility functions
 */

/**
 * Check if the browser is online
 * @returns {boolean} True if online, false otherwise
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Check network connectivity by attempting to fetch a small resource
 * @param {string} url - URL to test (defaults to a small Supabase endpoint)
 * @returns {Promise<boolean>} True if network is available, false otherwise
 */
export const checkNetworkConnectivity = async (url = 'https://www.google.com/favicon.ico') => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true;
  } catch (error) {
    // If we get here, network is likely unavailable
    return false;
  }
};

/**
 * Wrap a fetch call with network error handling
 * @param {Function} fetchFn - Function that returns a fetch promise
 * @param {string} errorMessage - Custom error message
 * @returns {Promise} The fetch result
 */
export const withNetworkErrorHandling = async (fetchFn, errorMessage = 'Network error') => {
  if (!isOnline()) {
    throw new Error('You are currently offline. Please check your internet connection.');
  }

  try {
    return await fetchFn();
  } catch (error) {
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('ERR_NAME_NOT_RESOLVED') ||
        error.message?.includes('NetworkError')) {
      throw new Error(`${errorMessage}: Unable to connect to the server. Please check your internet connection.`);
    }
    throw error;
  }
};

/**
 * Listen for online/offline events
 * @param {Function} onOnline - Callback when coming online
 * @param {Function} onOffline - Callback when going offline
 * @returns {Function} Cleanup function to remove listeners
 */
export const listenToNetworkStatus = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

