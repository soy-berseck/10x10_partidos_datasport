
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Match, Team, Player, Event, MatchStatus, Sport, Category, Gender, FilterOptions, FullMatchData, PlayerStats, SchoolData, SportData, CategoryData, PlayerScoreSummary } from '../types';
import MatchCard from '../components/MatchCard';
import FilterPanel from '../components/FilterPanel';
import { SPORT_EVENT_TYPES_MAP, PRIMARY_SCORING_EVENT_TYPES_MAP, SPORT_SCORE_TERM_MAP } from '../utils/sportConfig';

type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players';
interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
  matchId?: string; // Added for liveScoring to jump to specific match
}

interface DashboardProps {
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: Event[];
  onNavigateToLiveScoring: (matchId: string) => void;
  onNavigateToResults: (matchId: string) => void;
  // New props for dynamic lists
  allSchools: SchoolData[];
  allSports: SportData[]; // Changed to SportData[] to pass directly
  allCategories: CategoryData[];
  gendersList: Gender[];
  // Sport config maps
  sportEventTypesMap: typeof SPORT_EVENT_TYPES_MAP;
  sportScoreTermMap: typeof SPORT_SCORE_TERM_MAP;
  primaryScoringEventTypesMap: typeof PRIMARY_SCORING_EVENT_TYPES_MAP;
  onNavigate: (page: Page, options?: NavigateOptions) => void; // Added for Dashboard summary clicks
}

const Dashboard: React.FC<DashboardProps> = ({ 
  teams, 
  players, 
  matches, 
  events, 
  onNavigateToLiveScoring, 
  onNavigateToResults,
  allSchools,
  allSports, // Destructure as SportData[]
  allCategories,
  gendersList,
  sportEventTypesMap,
  sportScoreTermMap,
  primaryScoringEventTypesMap,
  onNavigate, // Destructure onNavigate
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    sport: 'all',
    category: 'all',
    gender: 'all'
  });

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ sport: 'all', category: 'all', gender: 'all' });
  }, []);

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      const matchDate = new Date(match.match_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isToday = matchDate.toDateString() === today.toDateString();
      const isLive = match.status === MatchStatus.EN_VIVO;
      const isUpcoming = matchDate.getTime() > today.getTime() && match.status === MatchStatus.PROGRAMADO;

      // Apply sport, category, gender filters
      if (filters.sport !== 'all' && match.sport !== filters.sport) return false;
      if (filters.category !== 'all' && match.category !== filters.category) return false;
      if (filters.gender !== 'all' && match.gender !== filters.gender) return false;

      // Only show relevant matches for dashboard (today, live, upcoming)
      return isToday || isLive || isUpcoming;
    });
  }, [matches, filters]);

  const getMatchWithTeams = useCallback((match: Match): FullMatchData | null => {
    const team1 = teams.find(t => t.id === match.team1_id);
    const team2 = teams.find(t => t.id === match.team2_id);
    if (!team1 || !team2) return null;
    return { match, team1, team2, events: [] }; // Events are not needed for simple card display
  }, [teams]);

  const todayMatches = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredMatches
      .filter(m => new Date(m.match_date).toDateString() === today.toDateString())
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  }, [filteredMatches]);

  const liveMatches = useMemo(() => {
    return filteredMatches
      .filter(m => m.status === MatchStatus.EN_VIVO)
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  }, [filteredMatches]);

  const upcomingMatches = useMemo(() => {
    const now = Date.now();
    return filteredMatches
      .filter(m => m.status === MatchStatus.PROGRAMADO && new Date(m.match_date).getTime() > now)
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      .slice(0, 3); // Top 3 upcoming
  }, [filteredMatches]);

  const isSportSelectedForScorers = filters.sport !== 'all' && filters.sport !== undefined;
  const currentSportTerm = isSportSelectedForScorers ? sportScoreTermMap[filters.sport as Sport] : 'Puntuación';

  const topScorers = useMemo(() => {
    if (!isSportSelectedForScorers) return [];

    const playerScores: { [playerId: string]: number } = {};

    events.forEach(event => {
      if (!event.player_id) return;

      const match = matches.find(m => m.id === event.match_id);
      if (!match) return;

      // Apply sport, category, and gender filters for player stats calculation
      if (filters.sport !== 'all' && match.sport !== filters.sport) return;
      if (filters.category !== 'all' && match.category !== filters.category) return;
      if (filters.gender !== 'all' && match.gender !== filters.gender) return;

      const primaryScoringEvents = primaryScoringEventTypesMap[match.sport];
      if (primaryScoringEvents && primaryScoringEvents.includes(event.event_type)) {
        const eventDef = sportEventTypesMap[match.sport]?.find(def => def.type === event.event_type);
        if (eventDef?.affectsScore && eventDef.scorePoints) {
          playerScores[event.player_id] = (playerScores[event.player_id] || 0) + eventDef.scorePoints;
        }
      }
    });

    const rawScorerStats = Object.entries(playerScores)
      .map(([playerId, score]) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return null;
        const team = teams.find(t => t.id === player.team_id);
        if (!team) return null;

        return {
          playerId: player.id,
          name: player.full_name,
          teamName: team.name,
          school: team.school.name,
          score: score,
          assists: 0, // Not used in this specific top scorers list, but part of PlayerScoreSummary
          yellowCards: 0, redCards: 0, totalCards: 0, matchesPlayed: 0, // Placeholder for PlayerScoreSummary
          photo: player.photo_url,
        };
      });

    // Fix: Explicitly cast to PlayerScoreSummary[]
    const validScorerStats = rawScorerStats.filter(Boolean) as PlayerScoreSummary[];

    return validScorerStats
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [events, players, teams, matches, filters, isSportSelectedForScorers, sportEventTypesMap, primaryScoringEventTypesMap, sportScoreTermMap]);


  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Dashboard</h1>

      {/* Summary Section */}
      <section className="card mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Resumen del Torneo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <button
            onClick={() => onNavigate('teams')}
            className="card p-4 text-center cursor-pointer group"
            aria-label="Ver todos los equipos"
          >
            <p className="text-4xl font-extrabold text-indigo-800 group-hover:text-indigo-900">{teams.length}</p>
            <p className="text-lg font-semibold text-indigo-700 group-hover:text-indigo-800">Total de Equipos</p>
          </button>
          <button
            onClick={() => onNavigate('calendar')}
            className="card p-4 text-center cursor-pointer group"
            aria-label="Ver todos los partidos"
          >
            <p className="text-4xl font-extrabold text-green-800 group-hover:text-green-900">{matches.length}</p>
            <p className="text-lg font-semibold text-green-700 group-hover:text-green-800">Total de Partidos</p>
          </button>
          <button
            onClick={() => onNavigate('statistics', { playerTab: true })}
            className="card p-4 text-center cursor-pointer group"
            aria-label="Ver todos los jugadores en estadísticas"
          >
            <p className="text-4xl font-extrabold text-purple-800 group-hover:text-purple-900">{players.length}</p>
            <p className="text-lg font-semibold text-purple-700 group-hover:text-purple-800">Total de Jugadores</p>
          </button>
        </div>
      </section>

      <FilterPanel 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        clearFilters={clearFilters} 
        allSchools={allSchools}
        allSports={allSports} // Pass SportData[] directly
        allCategories={allCategories}
        gendersList={gendersList}
      />

      {/* Live Matches */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center">
          <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          Partidos En Vivo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveMatches.length > 0 ? (
            liveMatches.map(match => {
              const fullMatch = getMatchWithTeams(match);
              return fullMatch ? (
                <MatchCard
                  key={match.id}
                  match={fullMatch.match}
                  team1={fullMatch.team1}
                  team2={fullMatch.team2}
                  onClick={() => onNavigateToLiveScoring(match.id)} // Navigate to liveScoring detail view
                  showScore={true}
                  onNavigate={onNavigate} // Pass onNavigate to MatchCard
                />
              ) : null;
            })
          ) : (
            <p className="text-gray-600">No hay partidos en vivo actualmente.</p>
          )}
        </div>
      </section>

      {/* Today's Matches */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Partidos de Hoy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {todayMatches.length > 0 ? (
            todayMatches.map(match => {
              const fullMatch = getMatchWithTeams(match);
              if (!fullMatch) return null;
              if (match.status === MatchStatus.EN_VIVO) {
                return (
                  <MatchCard
                    key={match.id}
                    match={fullMatch.match}
                    team1={fullMatch.team1}
                    team2={fullMatch.team2}
                    onClick={() => onNavigateToLiveScoring(match.id)} // Navigate to liveScoring detail view
                    showScore={true}
                    onNavigate={onNavigate} // Pass onNavigate to MatchCard
                  />
                );
              }
              if (match.status === MatchStatus.FINALIZADO) {
                return (
                  <MatchCard
                    key={match.id}
                    match={fullMatch.match}
                    team1={fullMatch.team1}
                    team2={fullMatch.team2}
                    onClick={onNavigateToResults}
                    showScore={true}
                    onNavigate={onNavigate} // Pass onNavigate to MatchCard
                  />
                );
              }
              return (
                <MatchCard
                  key={match.id}
                  match={fullMatch.match}
                  team1={fullMatch.team1}
                  team2={fullMatch.team2}
                  onClick={() => onNavigateToResults(match.id)} // View details on results
                  showScore={false}
                  onNavigate={onNavigate} // Pass onNavigate to MatchCard
                />
              );
            })
          ) : (
            <p className="text-gray-600">No hay partidos programados para hoy.</p>
          )}
        </div>
      </section>

      {/* Upcoming 3 Matches */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Próximos Partidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingMatches.length > 0 ? (
            upcomingMatches.map(match => {
              const fullMatch = getMatchWithTeams(match);
              return fullMatch ? (
                <MatchCard
                  key={match.id}
                  match={fullMatch.match}
                  team1={fullMatch.team1}
                  team2={fullMatch.team2}
                  onClick={() => onNavigateToResults(match.id)} // View details on results
                  showScore={false}
                  onNavigate={onNavigate} // Pass onNavigate to MatchCard
                />
              ) : null;
            })
          ) : (
            <p className="text-gray-600">No hay próximos partidos programados.</p>
          )}
        </div>
      </section>

      {/* Top 5 Scorers (Conditional) */}
      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Top 5 {currentSportTerm}</h2>
        <div className="card p-6">
          {isSportSelectedForScorers ? (
            topScorers.length > 0 ? (
              <div className="space-y-4">
                {topScorers.map((scorer, index) => (
                  <div key={scorer.playerId} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-indigo-600 mr-3 w-8 text-center">{index + 1}.</span>
                      <img src={scorer.photo} alt={scorer.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                      <div>
                        <p className="font-semibold text-gray-800">{scorer.name}</p>
                        <p className="text-sm text-gray-600">{scorer.teamName} ({scorer.school})</p>
                      </div>
                    </div>
                    <span className="text-2xl font-extrabold text-indigo-700">{scorer.score}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No hay datos de {currentSportTerm.toLowerCase()} para los filtros seleccionados.</p>
            )
          ) : (
            <p className="bg-blue-100 border-blue-500 text-blue-700 p-4 rounded-md" role="alert" aria-live="polite">
              Por favor, selecciona un Deporte en los filtros de arriba para ver los principales {currentSportTerm.toLowerCase()}.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;