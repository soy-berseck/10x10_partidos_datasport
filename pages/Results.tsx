
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Match, Team, Event, MatchStatus, Player, FilterOptions, FullMatchData, EventType, PlayerStats, SchoolData, SportData, CategoryData, Sport, Gender } from '../types';
import MatchCard from '../components/MatchCard';
import FilterPanel from '../components/FilterPanel';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { SPORT_EVENT_TYPES_MAP, SPORT_SCORE_TERM_MAP } from '../utils/sportConfig'; // Import from new util file

type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players';
interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
  matchId?: string; // Added for liveScoring to jump to specific match
}

interface ResultsProps {
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: Event[];
  selectedMatchIdFromNav: string | null;
  resetSelectedMatchIdFromNav: () => void;
  // New props for dynamic lists
  allSchools: SchoolData[];
  allSports: SportData[]; // Changed to SportData[]
  allCategories: CategoryData[];
  gendersList: Gender[];
  // Sport config maps
  sportEventTypesMap: typeof SPORT_EVENT_TYPES_MAP;
  sportScoreTermMap: typeof SPORT_SCORE_TERM_MAP;
  onNavigate: (page: Page, options?: NavigateOptions) => void; // Added for MatchCard links
}

const Results: React.FC<ResultsProps> = ({
  teams,
  players,
  matches,
  events,
  selectedMatchIdFromNav,
  resetSelectedMatchIdFromNav,
  allSchools,
  allSports, // Destructure as SportData[]
  allCategories,
  gendersList,
  sportEventTypesMap, // Destructure the prop
  sportScoreTermMap, // Destructure the prop
  onNavigate, // Destructure onNavigate
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    sport: 'all',
    category: 'all',
    gender: 'all',
    school: 'all',
    startDate: '',
    endDate: '',
  });
  const [selectedMatchForDetails, setSelectedMatchForDetails] = useState<FullMatchData | null>(null);

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      sport: 'all',
      category: 'all',
      gender: 'all',
      school: 'all',
      startDate: '',
      endDate: '',
    });
  }, []);

  const allFinishedMatchesWithTeams = useMemo(() => {
    return matches
      .filter(match => match.status === MatchStatus.FINALIZADO)
      .map(match => {
        const team1 = teams.find(t => t.id === match.team1_id);
        const team2 = teams.find(t => t.id === match.team2_id);
        const matchEvents = events.filter(e => e.match_id === match.id).sort((a, b) => a.minute - b.minute);
        return team1 && team2 ? { match, team1, team2, events: matchEvents } : null;
      })
      .filter(Boolean) as FullMatchData[];
  }, [matches, teams, events]);

  const filteredAndSortedMatches = useMemo(() => {
    return allFinishedMatchesWithTeams
      .filter(({ match, team1, team2 }) => {
        if (filters.sport !== 'all' && match.sport !== filters.sport) return false;
        if (filters.category !== 'all' && match.category !== filters.category) return false;
        if (filters.gender !== 'all' && match.gender !== filters.gender) return false;
        if (filters.school !== 'all' && filters.school !== undefined && team1.school.name !== filters.school && team2.school.name !== filters.school) return false;

        const matchDate = new Date(match.match_date);
        if (filters.startDate && matchDate < new Date(filters.startDate)) return false;
        if (filters.endDate && matchDate > new Date(filters.endDate + 'T23:59:59')) return false; // End of day

        return true;
      })
      .sort((a, b) => new Date(b.match.match_date).getTime() - new Date(a.match.match_date).getTime()); // Newest first
  }, [allFinishedMatchesWithTeams, filters]);

  const calculateMatchStats = useCallback((matchData: FullMatchData) => {
    const stats: {
      team1Score: number;
      team2Score: number;
      team1Cards: { yellow: number; red: number };
      team2Cards: { yellow: number; red: number };
      team1Events: number;
      team2Events: number;
    } = {
      team1Score: 0,
      team2Score: 0,
      team1Cards: { yellow: 0, red: 0 },
      team2Cards: { yellow: 0, red: 0 },
      team1Events: 0,
      team2Events: 0,
    };

    matchData.events.forEach(event => {
      const isTeam1Event = event.team_id === matchData.match.team1_id;
      if (isTeam1Event) stats.team1Events++; else stats.team2Events++;

      const eventDef = sportEventTypesMap[matchData.match.sport]?.find(def => def.type === event.event_type); // Use prop here
      if (eventDef?.affectsScore && eventDef.scorePoints) {
        if (isTeam1Event) stats.team1Score += eventDef.scorePoints; else stats.team2Score += eventDef.scorePoints;
      }

      if (event.event_type === EventType.TARJETA_AMARILLA) {
        if (isTeam1Event) stats.team1Cards.yellow++; else stats.team2Cards.yellow++;
      } else if (event.event_type === EventType.TARJETA_ROJA) {
        if (isTeam1Event) stats.team1Cards.red++; else stats.team2Cards.red++;
      }
    });

    return stats;
  }, [sportEventTypesMap]); // Add to dependency array

  const openMatchDetailsModal = useCallback((matchId: string) => {
    const matchData = allFinishedMatchesWithTeams.find(m => m.match.id === matchId);
    if (matchData) {
      setSelectedMatchForDetails(matchData);
    }
  }, [allFinishedMatchesWithTeams]);

  useEffect(() => {
    if (selectedMatchIdFromNav) {
      openMatchDetailsModal(selectedMatchIdFromNav);
      resetSelectedMatchIdFromNav();
    }
  }, [selectedMatchIdFromNav, openMatchDetailsModal, resetSelectedMatchIdFromNav]);

  const matchStats = selectedMatchForDetails ? calculateMatchStats(selectedMatchForDetails) : null;

  const currentSportTerm = selectedMatchForDetails?.match.sport ? sportScoreTermMap[selectedMatchForDetails.match.sport] : 'Puntuación'; // Use prop here


  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Resultados de Partidos</h1>

      <FilterPanel 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        showSchoolFilter={true} 
        clearFilters={clearFilters}
        allSchools={allSchools}
        allSports={allSports} // Pass SportData[] directly
        allCategories={allCategories}
        gendersList={gendersList}
      >
        <div className="flex flex-wrap items-center gap-4">
          <label htmlFor="startDate" className="text-gray-700">Desde:</label>
          <input
            type="date"
            id="startDate"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange({ ...filters, startDate: e.target.value })}
            className="w-full"
          />
          <label htmlFor="endDate" className="text-gray-700">Hasta:</label>
          <input
            type="date"
            id="endDate"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange({ ...filters, endDate: e.target.value })}
            className="w-full"
          />
        </div>
      </FilterPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedMatches.length > 0 ? (
          filteredAndSortedMatches.map(({ match, team1, team2 }) => (
            <MatchCard
              key={match.id}
              match={match}
              team1={team1}
              team2={team2}
              onClick={openMatchDetailsModal}
              showScore={true}
              onNavigate={onNavigate} // Pass onNavigate to MatchCard
            />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-600">No hay partidos finalizados que coincidan con los filtros.</p>
        )}
      </div>

      <Modal
        isOpen={!!selectedMatchForDetails}
        onClose={() => setSelectedMatchForDetails(null)}
        title={`Detalles del Partido - ${selectedMatchForDetails?.team1?.school.name.split(' ')[0]} vs ${selectedMatchForDetails?.team2?.school.name.split(' ')[0]}`}
        size="lg"
      >
        {selectedMatchForDetails && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Información General</h3>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xl font-semibold text-gray-700">{selectedMatchForDetails.team1.name} ({selectedMatchForDetails.team1.school.name})</p>
                <span className="text-4xl font-extrabold text-gray-800 mx-4">{selectedMatchForDetails.match.team1_score}</span>
                <span className="2xl text-gray-400">-</span>
                <span className="text-4xl font-extrabold text-gray-800 mx-4">{selectedMatchForDetails.match.team2_score}</span>
                <p className="text-xl font-semibold text-gray-700">{selectedMatchForDetails.team2.name} ({selectedMatchForDetails.team2.school.name})</p>
              </div>
              <p className="text-gray-600 text-center text-sm mb-1">
                {new Date(selectedMatchForDetails.match.match_date).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
              <p className="text-gray-600 text-center text-sm">
                Ubicación: {selectedMatchForDetails.match.location} - {selectedMatchForDetails.match.sport}, {selectedMatchForDetails.match.category}, {selectedMatchForDetails.match.gender}
              </p>
            </div>

            {matchStats && (
              <div className="card">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Estadísticas del Partido</h3>
                <div className="grid grid-cols-2 gap-4 text-gray-700">
                  <div>
                    <p className="font-semibold">{selectedMatchForDetails.team1.name} ({selectedMatchForDetails.team1.school.name})</p>
                    <p>{currentSportTerm}: <span className="font-bold text-indigo-600">{matchStats.team1Score}</span></p>
                    <p>Tarjetas Amarillas: <span className="font-bold text-yellow-600">{matchStats.team1Cards.yellow}</span></p>
                    <p>Tarjetas Rojas: <span className="font-bold text-red-600">{matchStats.team1Cards.red}</span></p>
                    <p>Total Eventos: <span className="font-bold">{matchStats.team1Events}</span></p>
                  </div>
                  <div>
                    <p className="font-semibold">{selectedMatchForDetails.team2.name} ({selectedMatchForDetails.team2.school.name})</p>
                    <p>{currentSportTerm}: <span className="font-bold text-indigo-600">{matchStats.team2Score}</span></p>
                    <p>Tarjetas Amarillas: <span className="font-bold text-yellow-600">{matchStats.team2Cards.yellow}</span></p>
                    <p>Tarjetas Rojas: <span className="font-bold text-red-600">{matchStats.team2Cards.red}</span></p>
                    <p>Total Eventos: <span className="font-bold">{matchStats.team2Events}</span></p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Timeline Completo de Eventos</h3>
              <div className="relative border-l-4 border-gray-200 ml-4 pl-4">
                {selectedMatchForDetails.events.length === 0 && (
                  <p className="text-gray-600 text-center py-4">No hay eventos registrados para este partido.</p>
                )}
                {selectedMatchForDetails.events.map(event => {
                  const eventPlayer = players.find(p => p.id === event.player_id);
                  const eventTeam = teams.find(t => t.id === event.team_id);
                  const eventDef = sportEventTypesMap[selectedMatchForDetails.match.sport]?.find(def => def.type === event.event_type); // Use prop here

                  const isTeam1Event = event.team_id === selectedMatchForDetails.team1.id;

                  return (
                    <div key={event.id} className={`mb-4 flex ${isTeam1Event ? 'flex-row' : 'flex-row-reverse'} items-start`}>
                      <div className={`absolute w-4 h-4 rounded-full ${isTeam1Event ? '-left-2 bg-primary' : '-left-2 bg-secondary'}`}></div>
                      <div className={`flex-1 card p-3 border-l-4 ${isTeam1Event ? 'ml-8 border-primary' : 'mr-8 border-secondary'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-800 flex items-center">
                            <span className="text-md mr-1">{eventDef?.icon}</span> {eventDef?.label || event.event_type}
                          </span>
                          <span className="text-xs text-gray-500">{event.minute}'</span>
                        </div>
                        <p className="text-gray-700 text-sm">
                          {eventPlayer?.full_name} ({eventTeam?.name.split(' ')[0]})
                        </p>
                        {event.details?.text && (
                          <p className="text-xs text-gray-600 italic mt-1">{event.details.text}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Results;