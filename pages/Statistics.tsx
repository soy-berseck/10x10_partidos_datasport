
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Match, Team, Player, Event, EventType, Sport, Category, Gender, FilterOptions, PlayerStats, TeamStats, SchoolData, SportData, CategoryData, PlayerScoreSummary } from '../types';
import FilterPanel from '../components/FilterPanel';
import Dropdown from '../components/Dropdown';
import { SPORT_EVENT_TYPES_MAP, SPORT_SCORE_TERM_MAP, PRIMARY_SCORING_EVENT_TYPES_MAP } from '../utils/sportConfig'; // Import from new util file

type StatTab = 'scorers' | 'assists' | 'cards' | 'byTeam' | 'byPlayer';
type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players';
interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
  matchId?: string; // Added for liveScoring to jump to specific match
}

interface StatisticsProps {
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: Event[];
  // New props for dynamic lists
  allSchools: SchoolData[];
  allSports: SportData[]; // Changed to SportData[]
  allCategories: CategoryData[];
  gendersList: Gender[];
  // Sport config maps
  sportEventTypesMap: typeof SPORT_EVENT_TYPES_MAP;
  sportScoreTermMap: typeof SPORT_SCORE_TERM_MAP;
  primaryScoringEventTypesMap: typeof PRIMARY_SCORING_EVENT_TYPES_MAP;
  // New props for active tab control
  activeTab: StatTab;
  onTabChange: (tab: StatTab) => void;
  // For future deeper navigation if needed
  onNavigate?: (page: Page, options?: NavigateOptions) => void;
}

const Statistics: React.FC<StatisticsProps> = ({ 
  teams, 
  players, 
  matches, 
  events,
  allSchools,
  allSports, // Destructure as SportData[]
  allCategories,
  gendersList,
  sportEventTypesMap, // Destructure the prop
  sportScoreTermMap, // Destructure the prop
  primaryScoringEventTypesMap, // Destructure the prop
  activeTab, // Destructure activeTab
  onTabChange, // Destructure onTabChange
  onNavigate, // Destructure onNavigate
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    sport: 'all', // Default to 'all' but will require selection for display
    category: 'all',
    gender: 'all',
    school: 'all',
  });
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [selectedPlayerForDisplay, setSelectedPlayerForDisplay] = useState<PlayerStats | null>(null); // New state for selected player
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false); // New state for suggestions visibility


  // Update internal filters when activeTab changes (e.g. if navigated from dashboard)
  useEffect(() => {
    // No direct filter change needed just for tab, but useful for initial state
  }, [activeTab]);

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    // When filters change, clear selected player if it no longer matches the new filters
    setSelectedPlayerForDisplay(null);
    setPlayerSearchTerm('');
    setShowPlayerSuggestions(false);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      sport: 'all',
      category: 'all',
      gender: 'all',
      school: 'all',
    });
    setSelectedPlayerForDisplay(null);
    setPlayerSearchTerm('');
    setShowPlayerSuggestions(false);
  }, []);

  // --- Start of refactored player stats calculation ---
  const allPlayerBaseStats = useMemo(() => {
    const statsMap: { [playerId: string]: PlayerStats } = {};

    players.forEach(player => {
      const team = teams.find(t => t.id === player.team_id);
      if (!team) return;

      statsMap[player.id] = {
        playerId: player.id,
        name: player.full_name,
        teamName: team.name,
        school: team.school.name,
        yellowCards: 0,
        redCards: 0,
        totalCards: 0,
        matchesPlayed: 0, // This is overall matches played, will be updated below
        photo: player.photo_url,
        sportStats: [], // Will be populated in filteredPlayerStatsForLists if a sport is selected
      };
    });

    // Calculate matches played and cards (general stats, not specific to a filtered sport)
    matches.filter(m => m.status === 'Finalizado').forEach(match => {
        // Find players who actually participated in this match (simplistic, assumes all rostered players participated)
        const team1Players = players.filter(p => p.team_id === match.team1_id);
        const team2Players = players.filter(p => p.team_id === match.team2_id);
        
        [...team1Players, ...team2Players].forEach(player => {
            if (statsMap[player.id]) {
                statsMap[player.id].matchesPlayed++;
            }
        });
    });

    events.forEach(event => {
      if (!event.player_id || !statsMap[event.player_id]) return;
      const playerStat = statsMap[event.player_id];
      switch (event.event_type) {
        case EventType.TARJETA_AMARILLA:
          playerStat.yellowCards++;
          playerStat.totalCards++;
          break;
        case EventType.TARJETA_ROJA:
          playerStat.redCards++;
          playerStat.totalCards++;
          break;
        default:
          break;
      }
    });

    return Object.values(statsMap);
  }, [players, teams, matches, events]);


  // Filter for Top X lists (scorers, assists, cards) - depends on selected sport
  // This is where sport, category, gender, and school filters are applied for TOP lists
  const filteredPlayerStatsForLists = useMemo(() => {
    // Only proceed if a sport is selected for these lists (except for cards tab)
    if (filters.sport === 'all' || filters.sport === undefined) {
      // For cards, we can show overall cards regardless of sport filter
      // For scorers/assists, we need a sport.
      return activeTab === 'cards' ? 
        allPlayerBaseStats.map(ps => ({
          ...ps,
          score: 0, assists: 0 // Default to 0 for cards tab as these are not relevant primary metrics
        })) as PlayerScoreSummary[] : [];
    }

    const currentSport = filters.sport as Sport;
    const statsWithScores: PlayerScoreSummary[] = []; 

    allPlayerBaseStats.forEach(playerBaseStat => {
      const playerTeam = teams.find(t => t.id === players.find(p => p.id === playerBaseStat.playerId)?.team_id);
      if (!playerTeam) return;

      // Apply filters for lists (school, sport, category, gender)
      if (filters.school !== 'all' && filters.school !== undefined && playerTeam.school.name !== filters.school) return;
      if (playerTeam.sport.name !== currentSport) return; // Must match selected sport
      if (filters.category !== 'all' && playerTeam.category.name !== filters.category) return;
      if (filters.gender !== 'all' && playerTeam.gender !== filters.gender) return;

      // Filter events relevant to the current player and the selected sport/category/gender
      const playerEventsForFilteredSport = events.filter(event => {
        if (event.player_id !== playerBaseStat.playerId) return false;
        const match = matches.find(m => m.id === event.match_id);
        if (!match) return false;
        
        return (
          match.sport === currentSport &&
          (filters.category === 'all' || match.category === filters.category) &&
          (filters.gender === 'all' || match.gender === filters.gender)
        );
      });

      let currentScore = 0;
      let currentAssists = 0;

      playerEventsForFilteredSport.forEach(event => {
        const primaryScoringEvents = primaryScoringEventTypesMap[currentSport];
        if (primaryScoringEvents && primaryScoringEvents.includes(event.event_type)) {
          const eventDef = sportEventTypesMap[currentSport]?.find(def => def.type === event.event_type);
          if (eventDef?.affectsScore && eventDef.scorePoints) {
            currentScore += eventDef.scorePoints;
          }
        }
        if (event.event_type === EventType.ASISTENCIA_FUTBOL || event.event_type === EventType.ASISTENCIA_BALONCESTO) {
          currentAssists++;
        }
      });
      
      statsWithScores.push({ 
        playerId: playerBaseStat.playerId,
        name: playerBaseStat.name,
        teamName: playerBaseStat.teamName,
        school: playerBaseStat.school,
        photo: playerBaseStat.photo,
        yellowCards: playerBaseStat.yellowCards,
        redCards: playerBaseStat.redCards,
        totalCards: playerBaseStat.totalCards,
        matchesPlayed: playerBaseStat.matchesPlayed,
        score: currentScore, 
        assists: currentAssists 
      });
    });

    return statsWithScores;
  }, [allPlayerBaseStats, filters, events, matches, teams, sportEventTypesMap, primaryScoringEventTypesMap, activeTab, players]);


  // Filter for "byPlayer" tab suggestions - dynamically as user types
  const matchingPlayerSuggestions = useMemo(() => {
    if (!playerSearchTerm) return [];

    const lowerCaseSearchTerm = playerSearchTerm.toLowerCase();
    
    // Filter PlayerStats for suggestions
    return (allPlayerBaseStats as PlayerStats[]).filter(stats => { 
      const playerTeam = teams.find(t => t.id === players.find(p => p.id === stats.playerId)?.team_id);
      if (!playerTeam) return false;

      // Apply filters from FilterPanel to suggestions as well
      if (filters.school !== 'all' && filters.school !== undefined && playerTeam.school.name !== filters.school) return false;
      if (filters.sport !== 'all' && playerTeam.sport.name !== filters.sport) return false;
      if (filters.category !== 'all' && playerTeam.category.name !== filters.category) return false;
      if (filters.gender !== 'all' && playerTeam.gender !== filters.gender) return false;

      return stats.name.toLowerCase().includes(lowerCaseSearchTerm);
    }).slice(0, 10); // Limit suggestions for performance/UI
  }, [allPlayerBaseStats, playerSearchTerm, filters, teams, players]);


  // Helper to calculate score and assists for a specific player (used in 'byPlayer' tab)
  const calculatePlayerSportSpecificScores = useCallback((playerToCalculate: PlayerStats, selectedSport: Sport | 'all', selectedCategory: Category | 'all', selectedGender: Gender | 'all'): { score: number; assists: number; scoreTerm: string; assistTerm: string } => {
    let currentScore = 0;
    let currentAssists = 0;
    let scoreTerm = 'Puntuación';
    let assistTerm = 'Asistencias';

    const playerEvents = events.filter(e => e.player_id === playerToCalculate.playerId);

    if (selectedSport !== 'all' && selectedSport !== undefined) {
      scoreTerm = sportScoreTermMap[selectedSport];
      assistTerm = `Asistencias (${selectedSport})`;

      playerEvents.forEach(event => {
        const match = matches.find(m => m.id === event.match_id);
        if (!match) return;

        // Apply selectedSport, selectedCategory, selectedGender for score/assist calculation
        if (match.sport === selectedSport &&
            (selectedCategory === 'all' || match.category === selectedCategory) &&
            (selectedGender === 'all' || match.gender === selectedGender)) {
          
          const primaryScoringEvents = primaryScoringEventTypesMap[selectedSport];
          if (primaryScoringEvents && primaryScoringEvents.includes(event.event_type)) {
            const eventDef = sportEventTypesMap[selectedSport]?.find(def => def.type === event.event_type);
            if (eventDef?.affectsScore && eventDef.scorePoints) {
              currentScore += eventDef.scorePoints;
            }
          }
          if (event.event_type === EventType.ASISTENCIA_FUTBOL || event.event_type === EventType.ASISTENCIA_BALONCESTO) {
            currentAssists++;
          }
        }
      });
    } else {
      scoreTerm = 'Puntuación Total';
      assistTerm = 'Asistencias Totales';
      
      playerEvents.forEach(event => {
        const match = matches.find(m => m.id === event.match_id);
        if (!match) return;

        const sport = match.sport;
        const primaryScoringEvents = primaryScoringEventTypesMap[sport];
        if (primaryScoringEvents && primaryScoringEvents.includes(event.event_type)) {
            const eventDef = sportEventTypesMap[sport]?.find(def => def.type === event.event_type);
            if (eventDef?.affectsScore && eventDef.scorePoints) {
                currentScore += eventDef.scorePoints;
            }
        }
        if (event.event_type === EventType.ASISTENCIA_FUTBOL || event.event_type === EventType.ASISTENCIA_BALONCESTO) {
            currentAssists++;
        }
      });
    }

    return { score: currentScore, assists: currentAssists, scoreTerm, assistTerm };
  }, [events, matches, sportEventTypesMap, primaryScoringEventTypesMap, sportScoreTermMap]);


  const allTeamStats = useMemo(() => {
    const statsMap: { [teamId: string]: TeamStats } = {};

    teams.forEach(team => {
      statsMap[team.id] = {
        teamId: team.id,
        teamName: team.name,
        school: team.school.name,
        sport: team.sport.name,
        category: team.category.name,
        gender: team.gender,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0, 
        goalsAgainst: 0, 
        goalDifference: 0, 
        points: 0,
      };
    });

    matches.filter(m => m.status === 'Finalizado').forEach(match => {
      // Filter matches before updating team stats
      if (filters.sport !== 'all' && match.sport !== filters.sport) return;
      if (filters.category !== 'all' && match.category !== filters.category) return;
      if (filters.gender !== 'all' && match.gender !== filters.gender) return;
      if (filters.school !== 'all' && filters.school !== undefined && match.team1.school.name !== filters.school && match.team2.school.name !== filters.school) return;

      const team1Stats = statsMap[match.team1_id];
      const team2Stats = statsMap[match.team2_id];
      
      if (!team1Stats || !team2Stats) return;

      team1Stats.matchesPlayed++;
      team2Stats.matchesPlayed++;

      team1Stats.goalsFor += match.team1_score;
      team1Stats.goalsAgainst += match.team2_score;
      team2Stats.goalsFor += match.team2_score;
      team2Stats.goalsAgainst += match.team1_score;

      if (match.team1_score > match.team2_score) {
        team1Stats.wins++;
        team1Stats.points += 3;
        team2Stats.losses++;
      } else if (match.team1_score < match.team2_score) {
        team2Stats.wins++;
        team2Stats.points += 3;
        team1Stats.losses++;
      } else {
        team1Stats.draws++;
        team1Stats.points += 1;
        team2Stats.draws++;
        team2Stats.points += 1;
      }

      team1Stats.goalDifference = team1Stats.goalsFor - team1Stats.goalsAgainst;
      team2Stats.goalDifference = team2Stats.goalsFor - team2Stats.goalsAgainst;
    });

    return Object.values(statsMap);
  }, [teams, matches, filters]);


  const filteredTeamStats = useMemo(() => {
    // allTeamStats is already filtered by sport, category, gender, school within its memo.
    // This memo only sorts.
    return allTeamStats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
  }, [allTeamStats]);


  const topScorers = useMemo(() => filteredPlayerStatsForLists.sort((a, b) => b.score - a.score).slice(0, 20), [filteredPlayerStatsForLists]);
  const topAssisters = useMemo(() => filteredPlayerStatsForLists.sort((a, b) => b.assists - a.assists).slice(0, 20), [filteredPlayerStatsForLists]);
  const playersWithCards = useMemo(() => filteredPlayerStatsForLists.filter(p => p.totalCards > 0).sort((a, b) => b.totalCards - a.totalCards), [filteredPlayerStatsForLists]); 
  

  // Determine if a specific sport is selected
  const isSportSelected = filters.sport !== 'all' && filters.sport !== undefined;
  const currentSportTerm = isSportSelected ? sportScoreTermMap[filters.sport as Sport] : 'Puntuación';

  // Handler for player search input change
  const handlePlayerSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setPlayerSearchTerm(term);
    setSelectedPlayerForDisplay(null); // Clear selected player when typing
    setShowPlayerSuggestions(term.length > 0); // Show suggestions if term is not empty
  }, []);

  // Handler for selecting a player from suggestions
  const handleSelectPlayerFromSuggestions = useCallback((player: PlayerStats) => {
    setSelectedPlayerForDisplay(player);
    setPlayerSearchTerm(player.name); // Set search term to full name of selected player
    setShowPlayerSuggestions(false); // Hide suggestions
  }, []);

  // Close suggestions if clicked outside (simple version)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside the search input and suggestions list
      if (!target.closest('.player-search-container')) {
        setShowPlayerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Estadísticas del Torneo</h1>

      <FilterPanel 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        showSchoolFilter={true} 
        clearFilters={clearFilters} 
        allSchools={allSchools}
        allSports={allSports} // Pass SportData[] directly
        allCategories={allCategories}
        gendersList={gendersList}
      />

      <div className="card p-6">
        <div className="flex border-b border-gray-200 mb-6">
          <TabButton isActive={activeTab === 'scorers'} onClick={() => onTabChange('scorers')}>Goleadores</TabButton>
          <TabButton isActive={activeTab === 'assists'} onClick={() => onTabChange('assists')}>Asistencias</TabButton>
          <TabButton isActive={activeTab === 'cards'} onClick={() => onTabChange('cards')}>Tarjetas</TabButton>
          <TabButton isActive={activeTab === 'byTeam'} onClick={() => onTabChange('byTeam')}>Por Equipo</TabButton>
          <TabButton isActive={activeTab === 'byPlayer'} onClick={() => onTabChange('byPlayer')}>Por Jugador</TabButton>
        </div>

        {/* Conditional rendering for tabs based on sport selection, except for 'byPlayer' and 'cards' (partially) */}
        {!isSportSelected && activeTab !== 'byPlayer' && activeTab !== 'cards' && (
          <div className="notification-info p-4 rounded-md mb-6" role="alert" aria-live="polite">
            <p className="font-semibold">Por favor, selecciona un Deporte para ver estas estadísticas.</p>
          </div>
        )}

        {/* Scorers Tab */}
        {isSportSelected && activeTab === 'scorers' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Top {currentSportTerm} (Top 20)</h2>
            <div className="overflow-x-auto">
              <table>
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Pos</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Foto</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Nombre</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Equipo</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Colegio</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">{currentSportTerm}</th>
                  </tr>
                </thead>
                <tbody>
                  {topScorers.length > 0 ? (
                    topScorers.map((player, index) => (
                      <tr key={player.playerId} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800 font-semibold">{index + 1}</td>
                        <td className="py-3 px-4"><img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover" /></td>
                        <td className="py-3 px-4 text-gray-800">{player.name}</td>
                        <td className="py-3 px-4 text-gray-600">{player.teamName}</td>
                        <td className="py-3 px-4 text-gray-600">{player.school}</td>
                        <td className="py-3 px-4 text-indigo-600 font-bold">{player.score}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="py-4 text-center text-gray-600">No hay {currentSportTerm.toLowerCase()} para los filtros seleccionados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Assists Tab */}
        {isSportSelected && activeTab === 'assists' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Top Asistencias (Top 20)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Pos</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Foto</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Nombre</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Equipo</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Colegio</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Asistencias</th>
                  </tr>
                </thead>
                <tbody>
                  {topAssisters.length > 0 ? (
                    topAssisters.map((player, index) => (
                      <tr key={player.playerId} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800 font-semibold">{index + 1}</td>
                        <td className="py-3 px-4"><img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover" /></td>
                        <td className="py-3 px-4 text-gray-800">{player.name}</td>
                        <td className="py-3 px-4 text-gray-600">{player.teamName}</td>
                        <td className="py-3 px-4 text-gray-600">{player.school}</td>
                        <td className="py-3 px-4 text-orange-600 font-bold">{player.assists}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="py-4 text-center text-gray-600">No hay asistencias para los filtros seleccionados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && ( // Cards tab does not strictly require sport filter
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Jugadores con Tarjetas</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Foto</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Nombre</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Equipo</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Amarillas 🟨</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Rojas 🟥</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {playersWithCards.length > 0 ? (
                    playersWithCards.map((player) => (
                      <tr key={player.playerId} className={`border-b last:border-b-0 hover:bg-gray-50 ${player.redCards > 0 ? 'bg-red-50' : ''}`}>
                        <td className="py-3 px-4"><img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover" /></td>
                        <td className="py-3 px-4 text-gray-800 font-semibold">{player.name}</td>
                        <td className="py-3 px-4 text-gray-600">{player.teamName}</td>
                        <td className="py-3 px-4 text-yellow-600 font-bold">{player.yellowCards}</td>
                        <td className="py-3 px-4 text-red-600 font-bold">{player.redCards}</td>
                        <td className="py-3 px-4 text-gray-800 font-bold">{player.totalCards}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="py-4 text-center text-gray-600">No hay jugadores con tarjetas para los filtros seleccionados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By Team Tab */}
        {isSportSelected && activeTab === 'byTeam' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Estadísticas por Equipo</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Equipo</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Colegio</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">PJ</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">PG</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">PE</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">PP</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">{currentSportTerm} a Favor</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">{currentSportTerm} en Contra</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">DIF</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeamStats.length > 0 ? (
                    filteredTeamStats.map((team) => (
                      <tr key={team.teamId} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800 font-semibold">{team.teamName}</td>
                        <td className="py-3 px-4 text-gray-600">{team.school}</td>
                        <td className="py-3 px-4 text-gray-800">{team.matchesPlayed}</td>
                        <td className="py-3 px-4 text-green-600 font-bold">{team.wins}</td>
                        <td className="py-3 px-4 text-gray-600">{team.draws}</td>
                        <td className="py-3 px-4 text-red-600 font-bold">{team.losses}</td>
                        <td className="py-3 px-4 text-indigo-600 font-bold">{team.goalsFor}</td>
                        <td className="py-3 px-4 text-orange-600 font-bold">{team.goalsAgainst}</td>
                        <td className="py-3 px-4 text-gray-800 font-bold">{team.goalDifference}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={9} className="py-4 text-center text-gray-600">No hay estadísticas de equipo para los filtros seleccionados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By Player Tab (more flexible on sport selection) */}
        {activeTab === 'byPlayer' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Estadísticas por Jugador</h2>
            <div className="mb-4 relative player-search-container"> {/* Added class for click outside */}
              <input
                type="text"
                placeholder="Buscar jugador por nombre..."
                value={playerSearchTerm}
                onChange={handlePlayerSearchChange}
                onFocus={() => playerSearchTerm.length > 0 && setShowPlayerSuggestions(true)}
                className="p-2 border border-gray-300 rounded-md w-full max-w-sm focus:ring-2 focus:ring-indigo-500"
                aria-label="Buscar jugador"
              />
              {showPlayerSuggestions && matchingPlayerSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full max-w-sm bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {matchingPlayerSuggestions.map((player) => (
                    <li
                      key={player.playerId}
                      className="p-3 hover:bg-gray-100 cursor-pointer flex items-center space-x-3 border-b last:border-b-0"
                      onClick={() => handleSelectPlayerFromSuggestions(player)}
                    >
                      <img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="font-semibold text-gray-800">{player.name}</p>
                        <p className="text-xs text-gray-600">{player.teamName} ({player.school})</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {selectedPlayerForDisplay ? (
              // Dynamic calculation for score and assists based on current filters
              // The `filters.sport` will determine if it's aggregated or sport-specific
              (() => {
                const { score: dynamicScore, assists: dynamicAssists, scoreTerm, assistTerm } =
                  calculatePlayerSportSpecificScores(selectedPlayerForDisplay, filters.sport, filters.category, filters.gender);
              
                return (
                  <div className="bg-gray-50 p-4 rounded-lg shadow-md flex items-center space-x-4">
                    <img src={selectedPlayerForDisplay.photo} alt={selectedPlayerForDisplay.name} className="w-16 h-16 rounded-full object-cover" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{selectedPlayerForDisplay.name}</h3>
                      <p className="text-gray-600">{selectedPlayerForDisplay.teamName} ({selectedPlayerForDisplay.school})</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 text-gray-700 text-sm">
                        <p>Partidos Jugados: <span className="font-bold">{selectedPlayerForDisplay.matchesPlayed}</span></p>
                        <p>{scoreTerm}: <span className="font-bold text-indigo-700">{dynamicScore}</span></p>
                        <p>{assistTerm}: <span className="font-bold text-orange-600">{dynamicAssists}</span></p>
                        <p>Amarillas: <span className="font-bold text-yellow-600">{selectedPlayerForDisplay.yellowCards}</span></p>
                        <p>Rojas: <span className="font-bold text-red-600">{selectedPlayerForDisplay.redCards}</span></p>
                        <p>Total Tarjetas: <span className="font-bold">{selectedPlayerForDisplay.totalCards}</span></p>
                      </div>
                    </div>
                  </div>
                );
              })() // Self-invoking function to wrap variable declaration and return JSX
            ) : playerSearchTerm && matchingPlayerSuggestions.length === 0 && showPlayerSuggestions ? (
              <p className="text-gray-600">No se encontraron jugadores que coincidan con la búsqueda y filtros actuales.</p>
            ) : (
              <p className="text-gray-600">Introduce un nombre o selecciona un jugador de la lista para ver sus estadísticas.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className={`
        nav-tab
        ${isActive
          ? 'active'
          : ''
        }
      `}
    >
      {children}
    </button>
  );
};

export default Statistics;