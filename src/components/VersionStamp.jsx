import React from 'react';

const VersionStamp = () => {
  // Get build time and version from Vite environment variables
  const buildTime = __BUILD_TIME__ || new Date().toISOString();
  const buildVersion = __BUILD_VERSION__ || '0.0.0';
  
  // Format the build time for display
  const formatBuildTime = (isoString) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      
      // Format as DD/MM/YYYY HH:MM:SS
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('Error formatting build time:', error);
      return 'Unknown';
    }
  };

  return (
    <div className="text-center text-xs text-gray-500 mt-4">
      <div>Version: {buildVersion}</div>
      <div>Release Date: {formatBuildTime(buildTime)}</div>
    </div>
  );
};

export default VersionStamp;
