import React from 'react';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-gray-800/50 border border-gray-700/50 rounded-2xl shadow-2xl animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white">Application Settings</h2>
        <p className="text-gray-400 mt-2">Adjust your preferences for the application.</p>
      </div>
      
      <div className="space-y-8">
        <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold text-cyan-400 mb-2">Display Preferences</h3>
            <p className="text-gray-400">
                Future settings for theme (light/dark mode), chart colors, and data density will appear here.
            </p>
        </div>
        <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold text-cyan-400 mb-2">Data Processing</h3>
            <p className="text-gray-400">
                Options to adjust default currency, date format, and commission calculation methods will be available.
            </p>
        </div>
      </div>

      <div className="text-center mt-12">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105"
          aria-label="Back to dashboard"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Settings;
