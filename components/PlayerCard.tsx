
import React from 'react';
import { Player, Team } from '../types';

interface PlayerCardProps {
  player: Player;
  team: Team; // Full team object to get school name and ID
  onViewPlayerDetails: (playerId: string) => void; // Changed prop name
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, team, onViewPlayerDetails }) => {
  return (
    <div
      className="card p-4 flex items-center cursor-pointer
                 transition-all duration-200 hover:shadow-lg hover:bg-gray-50"
      onClick={() => onViewPlayerDetails(player.id)} // Calls the new handler
      aria-label={`Ver estadísticas de ${player.full_name}`}
    >

      <div>
        <h3 className="text-lg font-bold text-gray-800">{player.full_name}</h3>
        {player.jersey_number && <p className="text-sm text-gray-600">#{player.jersey_number}</p>}
        <p className="text-sm font-semibold text-indigo-600">{team.name}</p>
        <p className="text-xs text-gray-500">{team.school.name}</p>
      </div>
    </div>
  );
};

export default PlayerCard;
