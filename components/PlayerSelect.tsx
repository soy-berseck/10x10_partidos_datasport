
import React from 'react';
import { Player } from '../types';

interface PlayerSelectProps {
  players: Player[];
  selectedPlayerId: string;
  onChange: (playerId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const PlayerSelect: React.FC<PlayerSelectProps> = ({ players, selectedPlayerId, onChange, placeholder = "Seleccionar Jugador", className = '', disabled = false }) => {
  return (
    <select
      value={selectedPlayerId}
      onChange={(e) => onChange(e.target.value)}
      className={`p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white ${className} ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
      disabled={disabled}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {players.map((player) => (
        <option key={player.id} value={player.id}>
          {player.full_name} {player.jersey_number !== undefined ? `(#${player.jersey_number})` : ''}
        </option>
      ))}
    </select>
  );
};

export default PlayerSelect;
