
import React, { useState, useMemo, useCallback } from 'react';
import { Team, Player, Sport, Category, Gender, FilterOptions, SchoolData, SportData, CategoryData } from '../types';
import FilterPanel from '../components/FilterPanel';
import Button from '../components/Button';
import PlayerCard from '../components/PlayerCard'; // Import the new PlayerCard
import TeamCard from '../components/TeamCard'; // Import the new TeamCard

type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players';
interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
  matchId?: string; // Added for liveScoring to jump to specific match
  playerId?: string; // Added for player detail navigation
}

interface TeamsProps {
  teams: Team[];
  allSports: SportData[]; // Changed from Sport[] to SportData[]
  allCategories: CategoryData[];
  gendersList: Gender[];
  activeTeamId: string | null; // New prop to show specific team details
  onNavigate: (page: Page, options?: NavigateOptions) => void; // For navigating to school details
  players: Player[]; // Necesario para mostrar jugadores de un equipo
  onViewPlayerDetails: (playerId: string) => void; // New prop for navigating to player details
}

// Helper to generate a consistent color for the school icon based on its name
// NOTE: Moved to SchoolCard.tsx and TeamCard.tsx for encapsulation
const getColorForSchool = (schoolName: string) => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  const hash = schoolName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};


const Teams: React.FC<TeamsProps> = ({ 
  teams, 
  allSports, // Destructure as SportData[]
  allCategories, 
  gendersList,
  activeTeamId,
  onNavigate,
  players,
  onViewPlayerDetails, // Destructure new prop
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    sport: 'all',
    category: 'all',
    gender: 'all',
  });

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      sport: 'all',
      category: 'all',
      gender: 'all',
    });
  }, []);

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      if (filters.sport !== 'all' && team.sport.name !== filters.sport) return false;
      if (filters.category !== 'all' && team.category.name !== filters.category) return false;
      if (filters.gender !== 'all' && team.gender !== filters.gender) return false;
      return true;
    });
  }, [teams, filters]);

  const selectedTeam = useMemo(() => {
    return activeTeamId ? teams.find(team => team.id === activeTeamId) : null;
  }, [activeTeamId, teams]);

  const teamPlayers = useMemo(() => {
    return selectedTeam ? players.filter(player => player.team_id === selectedTeam.id) : [];
  }, [selectedTeam, players]);

  // Handler for viewing team details (sets activeTeamId in App.tsx via onNavigate)
  const handleViewTeamDetails = useCallback((teamId: string) => {
    onNavigate('teams', { teamId });
  }, [onNavigate]);

  // Handler for navigating back to all teams
  const handleBackToAllTeams = useCallback(() => {
    onNavigate('teams'); // Navigate to teams page without an ID
  }, [onNavigate]);

  // Handler for navigating to school details
  const handleViewSchoolDetails = useCallback((schoolId: string) => {
    onNavigate('schools', { schoolId });
  }, [onNavigate]);


  if (selectedTeam) {
    // const initial = selectedTeam.school.name.charAt(0).toUpperCase(); // Removed, handled by TeamCard/SchoolCard
    // const bgColor = getColorForSchool(selectedTeam.school.name); // Removed, handled by TeamCard/SchoolCard

    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={handleBackToAllTeams} variant="secondary" aria-label="Volver a todos los equipos">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 10010-1.414l4-4a1 10011.414 0z" clipRule="evenodd" />
            </svg>
            Volver a Equipos
          </Button>
          <h1 className="text-3xl font-extrabold text-gray-800">Detalles del Equipo</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {selectedTeam.school.logo_url ? (
              <img 
                src={selectedTeam.school.logo_url} 
                alt={`Logo de ${selectedTeam.school.name}`} 
                className="w-24 h-24 rounded-full object-cover flex-shrink-0" 
                onError={(e) => { e.currentTarget.src = `https://via.placeholder.com/96/cccccc/ffffff?text=${selectedTeam.school.name.charAt(0).toUpperCase()}`; }}
              />
            ) : (
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold ${getColorForSchool(selectedTeam.school.name)} flex-shrink-0`}>
                {selectedTeam.school.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-1">{selectedTeam.name}</h2>
              <p className="text-lg text-gray-700 font-semibold">
                Colegio: <span 
                  className="text-indigo-600 hover:underline cursor-pointer"
                  onClick={() => handleViewSchoolDetails(selectedTeam.school.id)}
                  aria-label={`Ver detalles del colegio ${selectedTeam.school.name}`}
                >
                  {selectedTeam.school.name}
                </span>
              </p>
              <div className="mt-3 text-base text-gray-600 space-y-1">
                <p>Deporte: <span className="font-medium text-gray-800">{selectedTeam.sport.name}</span></p>
                <p>Categoría: <span className="font-medium text-gray-800">{selectedTeam.category.name}</span></p>
                <p>Género: <span className="font-medium text-gray-800">{selectedTeam.gender}</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Jugadores ({teamPlayers.length})</h3>
          {teamPlayers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {teamPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  team={selectedTeam} // Pass the selectedTeam for consistent info
                  onViewPlayerDetails={onViewPlayerDetails} // Pass the new handler
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No hay jugadores registrados para este equipo.</p>
          )}
        </div>
      </div>
    );
  }

  // Default view: List of all teams
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Todos los Equipos</h1>

      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        allSchools={[]} // Not directly used in Teams list filtering, but required by FilterPanel for dropdowns
        allSports={allSports} // Pass SportData[] directly
        allCategories={allCategories}
        gendersList={gendersList}
      />

      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTeams.map(team => (
            <TeamCard key={team.id} team={team} onViewDetails={handleViewTeamDetails} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600 text-lg">No hay equipos registrados o que coincidan con los filtros.</p>
      )}
    </div>
  );
};

export default Teams;