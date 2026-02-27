
import React, { useMemo } from 'react';
import { Team } from '../types';

interface TeamCardProps {
  team: Team;
  onViewDetails: (teamId: string) => void;
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

const TeamCard: React.FC<TeamCardProps> = ({ team, onViewDetails }) => {
  const initial = team.school.name.charAt(0).toUpperCase();
  const bgColor = useMemo(() => getColorForSchool(team.school.name), [team.school.name]);

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center text-center cursor-pointer 
                 transition-all duration-200 hover:shadow-lg hover:scale-105"
      onClick={() => onViewDetails(team.id)}
      aria-label={`Ver detalles del equipo ${team.name} de ${team.school.name}`}
    >
      {team.school.logo_url ? (
        <img 
          src={team.school.logo_url} 
          alt={`Logo de ${team.school.name}`} 
          className="w-16 h-16 rounded-full object-cover mb-3" 
          onError={(e) => { e.currentTarget.src = `https://via.placeholder.com/64/${bgColor.split('-')[1]}00/ffffff?text=${initial}`; }} // Fallback if logo fails
        />
      ) : (
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 ${bgColor}`}>
          {initial}
        </div>
      )}
      <h3 className="text-xl font-bold text-gray-800 mb-1">{team.name}</h3>
      <p className="text-gray-700 font-semibold">{team.school.name}</p>
      <div className="mt-2 text-sm text-gray-600 space-y-1">
        <p>Deporte: <span className="font-medium text-gray-800">{team.sport.name}</span></p>
        <p>Categoría: <span className="font-medium text-gray-800">{team.category.name}</span></p>
        <p>Género: <span className="font-medium text-gray-800">{team.gender}</span></p>
      </div>
    </div>
  );
};

export default TeamCard;
