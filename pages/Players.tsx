
import React, { useState, useMemo, useCallback } from 'react';
import { Player, Team, Match, Event, Sport, PlayerStats, PlayerSportStats, EventType } from '../types';
import PlayerCard from '../components/PlayerCard'; // Import the new PlayerCard
import Button from '../components/Button';
import { SPORT_EVENT_TYPES_MAP, SPORT_SCORE_TERM_MAP, PRIMARY_SCORING_EVENT_TYPES_MAP } from '../utils/sportConfig';

type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players';
interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
  matchId?: string;
  playerId?: string; // For navigating to specific player detail
}

interface PlayersProps {
  players: Player[];
  teams: Team[]; // Pass teams to get team info for PlayerCards
  matches: Match[]; // Pass matches for player stats calculation
  events: Event[]; // Pass events for player stats calculation
  allSports: Sport[]; // Pass sport names for player stats (e.g., to list all sports played)
  sportEventTypesMap: typeof SPORT_EVENT_TYPES_MAP;
  sportScoreTermMap: typeof SPORT_SCORE_TERM_MAP;
  primaryScoringEventTypesMap: typeof PRIMARY_SCORING_EVENT_TYPES_MAP;
  activePlayerId: string | null; // New prop to show specific player details
  onNavigate: (page: Page, options?: NavigateOptions) => void; // For deeper navigation to team details
}

const Players: React.FC<PlayersProps> = ({ 
  players, 
  teams, 
  matches, 
  events,
  allSports,
  sportEventTypesMap,
  sportScoreTermMap,
  primaryScoringEventTypesMap,
  activePlayerId, 
  onNavigate 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) {
      return players.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    return players
      .filter(player => player.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [players, searchTerm]);

  // Find the selected player based on activePlayerId
  const selectedPlayer = useMemo(() => {
    return activePlayerId ? players.find(player => player.id === activePlayerId) : null;
  }, [activePlayerId, players]);

  // Handler for navigating to player details (sets activePlayerId in App.tsx)
  const handleViewPlayerDetails = useCallback((playerId: string) => {
    onNavigate('players', { playerId });
  }, [onNavigate]);

  // Handler for navigating back to all players
  const handleBackToAllPlayers = useCallback(() => {
    onNavigate('players'); // Navigate to players page without an ID
  }, [onNavigate]);

  // Handler for navigating to team details (from player detail view)
  const handleViewTeamDetails = useCallback((teamId: string) => {
    onNavigate('teams', { teamId });
  }, [onNavigate]);


  // Render Player Detail View if a player is selected
  if (selectedPlayer) {
    const playerTeam = teams.find(team => team.id === selectedPlayer.team_id);
    if (!playerTeam) {
      return (
        <div className="container mx-auto p-4 md:p-6 text-center text-gray-600">
          <p>Error: No se encontró el equipo para este jugador.</p>
          <Button onClick={handleBackToAllPlayers} className="mt-4" variant="secondary">Volver a Jugadores</Button>
        </div>
      );
    }
    return (
      <PlayerDetailView
        player={selectedPlayer}
        team={playerTeam}
        allTeams={teams} // All teams needed for other calculations
        matches={matches}
        events={events}
        allSports={allSports}
        sportEventTypesMap={sportEventTypesMap}
        sportScoreTermMap={sportScoreTermMap}
        primaryScoringEventTypesMap={primaryScoringEventTypesMap}
        onBackToPlayers={handleBackToAllPlayers}
        onViewTeamDetails={handleViewTeamDetails}
      />
    );
  }

  // Default view: List of all players
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Todos los Jugadores</h1>

      <div className="mb-6 card p-4 rounded-lg shadow-md">
        <input
          type="text"
          placeholder="Buscar jugador por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
          aria-label="Buscar jugador"
        />
      </div>

      {filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredPlayers.map(player => {
            const playerTeam = teams.find(team => team.id === player.team_id);
            if (!playerTeam) return null; // Should not happen if data is consistent
            return (
              <PlayerCard 
                key={player.id} 
                player={player} 
                team={playerTeam} 
                onViewPlayerDetails={handleViewPlayerDetails} // Pass new handler
              />
            );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-600 text-lg py-10">No se encontraron jugadores que coincidan con la búsqueda.</p>
      )}
    </div>
  );
};

export default Players;


// --- New Player Detail View Component ---
interface PlayerDetailViewProps {
  player: Player;
  team: Team; // The player's current team
  allTeams: Team[]; // All teams for comprehensive stats calculation
  matches: Match[];
  events: Event[];
  allSports: Sport[];
  sportEventTypesMap: typeof SPORT_EVENT_TYPES_MAP;
  sportScoreTermMap: typeof SPORT_SCORE_TERM_MAP;
  primaryScoringEventTypesMap: typeof PRIMARY_SCORING_EVENT_TYPES_MAP;
  onBackToPlayers: () => void;
  onViewTeamDetails: (teamId: string) => void;
}

const PlayerDetailView: React.FC<PlayerDetailViewProps> = ({
  player,
  team,
  allTeams,
  matches,
  events,
  allSports,
  sportEventTypesMap,
  sportScoreTermMap,
  primaryScoringEventTypesMap,
  onBackToPlayers,
  onViewTeamDetails,
}) => {

  const calculatePlayerOverallStats = useCallback((): PlayerStats => {
    let yellowCards = 0;
    let redCards = 0;
    let totalCards = 0;
    let matchesPlayed = 0;

    const playedMatchIds = new Set<string>();

    events.forEach(event => {
      if (event.player_id === player.id) {
        // Count cards regardless of sport
        if (event.event_type === EventType.TARJETA_AMARILLA) yellowCards++;
        if (event.event_type === EventType.TARJETA_ROJA) redCards++;
        
        // Count unique matches played by this player for overall stats
        if (!playedMatchIds.has(event.match_id)) {
          const match = matches.find(m => m.id === event.match_id);
          if (match && match.status === 'Finalizado') { // Only count finished matches
            playedMatchIds.add(match.id);
          }
        }
      }
    });

    // Also count matches directly from matches list where player's team played
    matches.filter(m => m.status === 'Finalizado').forEach(match => {
      if (match.team1_id === player.team_id || match.team2_id === player.team_id) {
         // Check if the player was actually part of the team at that match time
         // This is a simplification; ideally player lineups would be per match
         // For now, if their team played, and they are in the team roster, count it.
         if (!playedMatchIds.has(match.id)) {
            playedMatchIds.add(match.id);
         }
      }
    });


    totalCards = yellowCards + redCards;
    matchesPlayed = playedMatchIds.size;

    // Calculate sport-specific stats
    const playerSportStats: PlayerSportStats[] = [];
    const uniqueSportsPlayed = new Set<Sport>();

    events.filter(e => e.player_id === player.id).forEach(event => {
      const match = matches.find(m => m.id === event.match_id);
      if (match) uniqueSportsPlayed.add(match.sport);
    });

    // Ensure the player's current team sport is included if they haven't had events yet
    uniqueSportsPlayed.add(team.sport.name);


    uniqueSportsPlayed.forEach(sport => {
      let currentScore = 0;
      let currentAssists = 0;
      let matchesPlayedInSport = new Set<string>();

      // Initialize new sport-specific metrics
      let threePointers = 0;
      let personalFouls = 0;
      let technicalFouls = 0;
      let blocks = 0;
      let acesCount = 0;
      let errors = 0;

      events.filter(e => e.player_id === player.id).forEach(event => {
        const match = matches.find(m => m.id === event.match_id);
        if (match && match.sport === sport) {
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

          // Count new sport-specific metrics
          if (sport === Sport.BALONCESTO) {
            if (event.event_type === EventType.CANASTA_3PTS) threePointers++;
            if (event.event_type === EventType.FALTA_PERSONAL) personalFouls++;
            if (event.event_type === EventType.FALTA_TECNICA) technicalFouls++;
          } else if (sport === Sport.VOLEIBOL) {
            if (event.event_type === EventType.BLOQUEO) blocks++;
            if (event.event_type === EventType.ACE) acesCount++;
            if (event.event_type === EventType.ERROR_VOLEIBOL) errors++;
          }

          if (match.status === 'Finalizado') {
            matchesPlayedInSport.add(match.id);
          }
        }
      });
       // Also count matches directly from matches list where player's team played for this specific sport
      matches.filter(m => m.status === 'Finalizado' && m.sport === sport && (m.team1_id === player.team_id || m.team2_id === player.team_id)).forEach(match => {
        if (!matchesPlayedInSport.has(match.id)) {
          matchesPlayedInSport.add(match.id);
        }
      });


      playerSportStats.push({
        sport: sport,
        score: currentScore,
        assists: currentAssists,
        scoreTerm: sportScoreTermMap[sport] || 'Puntuación',
        assistTerm: `Asistencias (${sport})`,
        matchesPlayedInSport: matchesPlayedInSport.size,
        // Assign new sport-specific metrics if greater than 0
        ...(threePointers > 0 && { threePointers }),
        ...(personalFouls > 0 && { personalFouls }),
        ...(technicalFouls > 0 && { technicalFouls }),
        ...(blocks > 0 && { blocks }),
        ...(acesCount > 0 && { acesCount }),
        ...(errors > 0 && { errors }),
      });
    });

    return {
      playerId: player.id,
      name: player.full_name,
      teamName: team.name,
      school: team.school.name,
      yellowCards,
      redCards,
      totalCards,
      matchesPlayed,
      photo: player.photo_url,
      sportStats: playerSportStats.sort((a,b) => a.sport.localeCompare(b.sport)),
    };
  }, [player, team, matches, events, sportEventTypesMap, sportScoreTermMap, primaryScoringEventTypesMap]);

  const overallStats = useMemo(() => calculatePlayerOverallStats(), [calculatePlayerOverallStats]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={onBackToPlayers} variant="secondary" aria-label="Volver a todos los jugadores">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 10011.414 0z" clipRule="evenodd" />
          </svg>
          Volver a Jugadores
        </Button>
        <h1 className="text-3xl font-extrabold text-gray-800">Estadísticas del Jugador</h1>
      </div>

      <div className="card p-6 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">

        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-1">{player.full_name}</h2>
          {player.jersey_number && <p className="text-xl text-gray-700 font-semibold mb-2">Dorsal: #{player.jersey_number}</p>}
          <p className="text-lg text-gray-700 font-semibold">
            Equipo: <span
              className="text-indigo-600 hover:underline cursor-pointer"
              onClick={() => onViewTeamDetails(team.id)}
              aria-label={`Ver detalles del equipo ${team.name}`}
            >
              {team.name} ({team.school.name})
            </span>
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 text-gray-700 text-base">
            <p>Partidos Jugados: <span className="font-bold">{overallStats.matchesPlayed}</span></p>
            <p>Tarjetas Amarillas: <span className="font-bold text-yellow-600">{overallStats.yellowCards}</span></p>
            <p>Tarjetas Rojas: <span className="font-bold text-red-600">{overallStats.redCards}</span></p>
            <p>Total Tarjetas: <span className="font-bold">{overallStats.totalCards}</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Estadísticas por Deporte</h3>
        {overallStats.sportStats.length > 0 ? (
          <div className="space-y-6">
            {overallStats.sportStats.map(sportStat => (
              <div key={sportStat.sport} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
                <h4 className="text-xl font-bold text-indigo-700 mb-3">{sportStat.sport}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-gray-700 text-base">
                  <p>Partidos Jugados: <span className="font-bold">{sportStat.matchesPlayedInSport}</span></p>
                  <p>{sportStat.scoreTerm}: <span className="font-bold text-green-600">{sportStat.score}</span></p>
                  <p>{sportStat.assistTerm}: <span className="font-bold text-orange-600">{sportStat.assists}</span></p>
                  
                  {/* Display additional sport-specific stats */}
                  {sportStat.sport === Sport.BALONCESTO && (
                    <>
                      {sportStat.threePointers !== undefined && sportStat.threePointers > 0 && <p>Triples: <span className="font-bold text-purple-600">{sportStat.threePointers}</span></p>}
                      {sportStat.personalFouls !== undefined && sportStat.personalFouls > 0 && <p>Faltas Personales: <span className="font-bold text-red-500">{sportStat.personalFouls}</span></p>}
                      {sportStat.technicalFouls !== undefined && sportStat.technicalFouls > 0 && <p>Faltas Técnicas: <span className="font-bold text-red-700">{sportStat.technicalFouls}</span></p>}
                    </>
                  )}
                  {sportStat.sport === Sport.VOLEIBOL && (
                    <>
                      {sportStat.blocks !== undefined && sportStat.blocks > 0 && <p>Bloqueos: <span className="font-bold text-blue-600">{sportStat.blocks}</span></p>}
                      {sportStat.acesCount !== undefined && sportStat.acesCount > 0 && <p>Aces: <span className="font-bold text-teal-600">{sportStat.acesCount}</span></p>}
                      {sportStat.errors !== undefined && sportStat.errors > 0 && <p>Errores: <span className="font-bold text-red-500">{sportStat.errors}</span></p>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">Este jugador no tiene estadísticas registradas en ningún deporte aún.</p>
        )}
      </div>
    </div>
  );
};
