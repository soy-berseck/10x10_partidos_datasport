
import React from 'react';

interface SportEventButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean; // Added disabled prop
}

const SportEventButton: React.FC<SportEventButtonProps> = ({ icon, label, onClick, className = '', disabled = false }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 sm:p-4 bg-gray-100 rounded-lg shadow-sm
                  hover:bg-gray-200 hover:shadow-md transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                  ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
    >
      <span className="text-xl sm:text-2xl mb-1">{icon}</span>
      <span className="text-xs sm:text-sm font-semibold text-gray-800 text-center">{label}</span>
    </button>
  );
};

export default SportEventButton;
