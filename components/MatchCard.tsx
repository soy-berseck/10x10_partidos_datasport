
import React from 'react';
import { Match, Team, MatchStatus } from '../types';

type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players' | 'registerTeamsPlayers';
interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
}

interface MatchCardProps {
  match: Match;
  team1: Team;
  team2: Team;
  onClick?: (matchId: string) => void;
  showScore?: boolean;
  onNavigate?: (page: Page, options?: NavigateOptions) => void; // Added for deeper navigation
  ariaLabel?: string; // New prop for accessibility
}

const MatchCard: React.FC<MatchCardProps> = ({ match, team1, team2, onClick, showScore = true, onNavigate, ariaLabel }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(match.id);
    }
  };

  const handleSchoolClick = (e: React.MouseEvent, schoolId: string) => {
    e.stopPropagation(); // Prevent card's onClick from firing
    if (onNavigate) {
      onNavigate('schools', { schoolId });
    }
  };

  const handleTeamClick = (e: React.MouseEvent, teamId: string) => {
    e.stopPropagation(); // Prevent card's onClick from firing
    if (onNavigate) {
      onNavigate('teams', { teamId });
    }
  };

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case MatchStatus.PROGRAMADO: return 'bg-blue-100 text-blue-800';
      case MatchStatus.EN_VIVO: return 'bg-red-100 text-red-800 animate-pulse';
      case MatchStatus.FINALIZADO: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formattedDate = new Date(match.match_date).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const formattedTime = new Date(match.match_date).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 flex flex-col justify-between transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}`}
      onClick={handleClick}
      role="link" // Indicates it's clickable and navigates
      tabIndex={onClick ? 0 : -1} // Make it focusable if clickable
      aria-label={ariaLabel || `Ver detalles del partido: ${team1.name} vs ${team2.name}`} // Use provided ariaLabel or default
    >
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(match.status)}`}>
          {match.status}
        </span>
        <span className="text-gray-500 text-sm">
          {match.sport} - {match.category}
        </span>
      </div>

      <div className="flex items-center justify-between text-lg font-bold mb-3">
        <div className="flex-1 text-center pr-2">
          <p
            className="text-gray-800 hover:underline cursor-pointer"
            onClick={(e) => handleSchoolClick(e, team1.school.id)}
            aria-label={`Ver colegio ${team1.school.name}`}
          >
            {team1.school.name.split(' ')[0]}
          </p>
          <p
            className="text-sm font-medium text-gray-600 hover:underline cursor-pointer"
            onClick={(e) => handleTeamClick(e, team1.id)}
            aria-label={`Ver equipo ${team1.name}`}
          >
            {team1.name}
          </p>
        </div>
        <span className="text-gray-500 mx-2">vs</span>
        <div className="flex-1 text-center pl-2">
          <p
            className="text-gray-800 hover:underline cursor-pointer"
            onClick={(e) => handleSchoolClick(e, team2.school.id)}
            aria-label={`Ver colegio ${team2.school.name}`}
          >
            {team2.school.name.split(' ')[0]}
          </p>
          <p
            className="text-sm font-medium text-gray-600 hover:underline cursor-pointer"
            onClick={(e) => handleTeamClick(e, team2.id)}
            aria-label={`Ver equipo ${team2.name}`}
          >
            {team2.name}
          </p>
        </div>
      </div>

      {showScore && (match.status === MatchStatus.FINALIZADO || match.status === MatchStatus.EN_VIVO) && (
        <div className="flex justify-center items-center text-4xl font-extrabold text-gray-800 my-2">
          <span className={`${match.team1_score > match.team2_score && match.status === MatchStatus.FINALIZADO ? 'text-green-600' : ''}`}>{match.team1_score}</span>
          <span className="mx-4 text-gray-400">-</span>
          <span className={`${match.team2_score > match.team1_score && match.status === MatchStatus.FINALIZADO ? 'text-green-600' : ''}`}>{match.team2_score}</span>
        </div>
      )}

      <div className="flex items-center text-sm text-gray-600 mt-3 border-t pt-2 border-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{formattedDate} {formattedTime}</span>
      </div>
      <div className="flex items-center text-sm text-gray-600 mt-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{match.location}</span>
      </div>
    </div>
  );
};

export default MatchCard;