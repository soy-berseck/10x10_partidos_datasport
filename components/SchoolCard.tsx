
import React, { useMemo } from 'react';
import { SchoolData } from '../types';

interface SchoolCardProps {
  school: SchoolData;
  onViewDetails: (schoolId: string) => void;
}

// Helper para generar un color consistente basado en el nombre del colegio
const getColorForSchool = (schoolName: string) => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  const hash = schoolName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const SchoolCard: React.FC<SchoolCardProps> = ({ school, onViewDetails }) => {
  const initial = school.name.charAt(0).toUpperCase();
  const bgColor = useMemo(() => getColorForSchool(school.name), [school.name]);

  return (
    <div 
      className="card p-6 flex flex-col items-center justify-center text-center 
                 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
      onClick={() => onViewDetails(school.id)}
      aria-label={`Ver detalles del colegio ${school.name}`}
    >
      {school.logo_url ? (
        <img 
          src={school.logo_url} 
          alt={`Logo de ${school.name}`} 
          className="w-20 h-20 rounded-full object-cover mb-4" 
          onError={(e) => { e.currentTarget.src = `https://via.placeholder.com/80/${bgColor.split('-')[1]}00/ffffff?text=${initial}`; }} // Fallback if logo fails
        />
      ) : (
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 ${bgColor}`}>
          {initial}
        </div>
      )}
      <h3 className="text-xl font-bold text-gray-800">{school.name}</h3>
    </div>
  );
};

export default SchoolCard;
