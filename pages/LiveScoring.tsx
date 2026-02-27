
import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Match, Team, Player, Event, MatchStatus, EventType, FullMatchData, mapToSupabaseEventType, Sport, SchoolData } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Dropdown from '../components/Dropdown';
import PlayerSelect from '../components/PlayerSelect';
import SportEventButton from '../components/SportEventButton';
import MatchCard from '../components/MatchCard';
import { SPORT_EVENT_TYPES_MAP, SPORT_SCORE_TERM_MAP } from '../utils/sportConfig';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';

type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players';
interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
  matchId?: string;
}

interface LiveScoringProps {
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: Event[];
  updateMatch: (updatedMatch: Match) => void;
  addEvent: (newEvent: Event) => void;
  removeEvent: (eventId: string) => void;
  activeMatchId: string | null; // This now dictates if it's overview or detail
  onCloseLiveScoring: () => void; // This will set activeMatchId to null in App.tsx
  // Added to allow navigation from overview to detail, or for MatchCard deep links
  onNavigate: (page: Page, options?: NavigateOptions) => void;
  // Sport config map
  sportEventTypesMap: typeof SPORT_EVENT_TYPES_MAP;
}

const LiveScoring: React.FC<LiveScoringProps> = ({
  teams,
  players,
  matches,
  events,
  updateMatch,
  addEvent,
  removeEvent,
  activeMatchId, // Pass this down
  onCloseLiveScoring, // Pass this down
  onNavigate, // Pass this down
  sportEventTypesMap, // Destructure the prop
}) => {
  const { currentUser } = useContext(AuthContext);
  const isEditor = currentUser?.role === 'editor';
  const { showNotification } = useNotification();

  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentEventType, setCurrentEventType] = useState<EventType | null>(null);
  const [eventTeamId, setEventTeamId] = useState<string>('');
  const [eventPlayerId, setEventPlayerId] = useState<string>('');
  const [eventMinute, setEventMinute] = useState<number>(0);
  const [eventDetails, setEventDetails] = useState<string>('');
  const [timerRunning, setTimerRunning] = useState(false);

  // Helper to calculate total score for a team based on all relevant events from the current `events` prop
  const calculateScoresFromEvents = useCallback((matchId: string, teamId: string, sport: Sport, currentEvents: Event[]): number => {
    let totalScore = 0;
    const sportEvents = sportEventTypesMap[sport];
    if (!sportEvents) return 0;

    currentEvents.filter(e => e.match_id === matchId && e.team_id === teamId).forEach(event => {
      const eventDef = sportEvents.find(def => def.type === event.event_type);
      if (eventDef?.affectsScore && eventDef.scorePoints !== undefined) {
        totalScore += eventDef.scorePoints;
      }
    });
    return totalScore;
  }, [sportEventTypesMap]);


  // Find the match and teams based on activeMatchId when entering detail mode
  useEffect(() => {
    if (activeMatchId) {
      const foundMatch = matches.find(m => m.id === activeMatchId);
      if (foundMatch) {
        setCurrentMatch(foundMatch);
        const t1 = teams.find(t => t.id === foundMatch.team1_id);
        const t2 = teams.find(t => t.id === foundMatch.team2_id);
        setTeam1(t1 || null);
        setTeam2(t2 || null);

        if (isEditor && foundMatch.status === MatchStatus.EN_VIVO && foundMatch.start_time_timestamp) {
          setTimerRunning(true);
        } else {
          setTimerRunning(false);
        }
      } else {
        // If activeMatchId is provided but match not found, go back to overview
        onCloseLiveScoring();
      }
    } else { // If activeMatchId is null, reset states for overview
      setCurrentMatch(null);
      setTeam1(null);
      setTeam2(null);
      setTimerRunning(false);
    }
  }, [activeMatchId, matches, teams, onCloseLiveScoring, isEditor]);


  // Timer logic for the detailed view
  useEffect(() => {
    let interval: number | undefined;
    if (timerRunning && currentMatch?.status === MatchStatus.EN_VIVO && currentMatch.start_time_timestamp !== undefined) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - currentMatch.start_time_timestamp!) / 1000);
        if (currentMatch.live_timer_seconds !== elapsed) {
          // This update is purely for local display, actual save to DB happens on timer pause/match finish
          setCurrentMatch(prev => prev ? { ...prev, live_timer_seconds: elapsed } : null);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning, currentMatch]); // Removed updateMatch from deps to prevent infinite loop

  // New: Function to handle updating match status from the overview or detail view
  const handleUpdateMatchStatus = useCallback(async (matchToUpdate: Match, newStatus: MatchStatus) => {
    if (!isEditor) return;

    let updatedMatchData: Partial<Match> = { status: newStatus };

    if (newStatus === MatchStatus.EN_VIVO) {
      // When starting a match, set start_time_timestamp if not already set,
      // and ensure live_timer_seconds is reset if it's a fresh start, or kept if resuming
      updatedMatchData.start_time_timestamp = Date.now() - (matchToUpdate.live_timer_seconds || 0) * 1000;
      showNotification('Partido iniciado/reanudado.', 'success');
    } else if (newStatus === MatchStatus.PROGRAMADO) {
      // When pausing, remove the start_time_timestamp and update live_timer_seconds to current elapsed
      updatedMatchData.start_time_timestamp = undefined;
      updatedMatchData.live_timer_seconds = matchToUpdate.live_timer_seconds; // Keep current time
      showNotification('Partido pausado.', 'info');
    } else if (newStatus === MatchStatus.FINALIZADO) {
      // When finishing, clear both timer fields
      updatedMatchData.live_timer_seconds = undefined;
      updatedMatchData.start_time_timestamp = undefined;
      showNotification('Partido finalizado exitosamente.', 'success');
    }

    await updateMatch({ ...matchToUpdate, ...updatedMatchData as Match });

    // If we're in the detail view for this match, update local state accordingly
    if (matchToUpdate.id === currentMatch?.id) {
      setCurrentMatch(prev => prev ? { ...prev, ...updatedMatchData as Match } : null);
      setTimerRunning(newStatus === MatchStatus.EN_VIVO);
      if (newStatus === MatchStatus.FINALIZADO) {
        onCloseLiveScoring(); // Go back to overview after finishing from detail
      }
    }
  }, [isEditor, updateMatch, currentMatch, onCloseLiveScoring, showNotification]);

  const handleStartPauseTimer = useCallback(async () => {
    if (!currentMatch || !isEditor) return;
    const newStatus = timerRunning ? MatchStatus.PROGRAMADO : MatchStatus.EN_VIVO;
    await handleUpdateMatchStatus(currentMatch, newStatus);
  }, [timerRunning, currentMatch, handleUpdateMatchStatus, isEditor]);

  const handleFinishMatch = useCallback(async () => {
    if (!currentMatch || !isEditor) return;
    if (window.confirm('¿Estás seguro de que quieres finalizar el partido?')) {
      await handleUpdateMatchStatus(currentMatch, MatchStatus.FINALIZADO);
    }
  }, [currentMatch, handleUpdateMatchStatus, isEditor]);


  const handleEventButtonClick = useCallback((eventType: EventType) => {
    if (!isEditor || !currentMatch) return;
    setCurrentEventType(eventType);
    setEventTeamId('');
    setEventPlayerId('');
    setEventMinute(currentMatch?.live_timer_seconds ? Math.floor(currentMatch.live_timer_seconds / 60) + 1 : 1);
    setEventDetails('');
    setIsEventModalOpen(true);
  }, [currentMatch, isEditor]);

  const handleSaveEvent = useCallback(async () => {
    if (!currentMatch || !isEditor || !currentEventType || !eventTeamId || !eventPlayerId || eventMinute <= 0) {
      alert('Por favor, completa todos los campos del evento.');
      return;
    }

    const newEvent: Event = {
      id: '', // Supabase will generate
      match_id: currentMatch.id,
      event_type: currentEventType,
      team_id: eventTeamId,
      player_id: eventPlayerId,
      minute: eventMinute,
      details: eventDetails ? { text: eventDetails } : {},
    };
    await addEvent(newEvent); // This will trigger a re-fetch in App.tsx, updating `events` prop

    // Re-calculate scores based on the NEW `events` array that includes the just-added event
    // We need to wait for App.tsx to re-fetch and update the `events` prop first.
    // For immediate UI update, we can optimistically update currentMatch score,
    // but the `fetchData` in App.tsx (triggered by `addEvent`) will eventually make it consistent.
    // To ensure consistency, let's rely on the refetched `events` in the next render cycle,
    // or pass an updated events list to calculateScoresFromEvents, if we want to avoid refetch.
    // Since App.tsx's addEvent/removeEvent already refetch, the `events` prop will eventually be fresh.
    // For now, let's pass the *current* events prop plus the new event for a more immediate calculation.
    const tempEventsForScoreCalc = [...events, newEvent];

    const updatedScore1 = calculateScoresFromEvents(currentMatch.id, currentMatch.team1_id, currentMatch.sport, tempEventsForScoreCalc);
    const updatedScore2 = calculateScoresFromEvents(currentMatch.id, currentMatch.team2_id, currentMatch.sport, tempEventsForScoreCalc);

    await updateMatch({
      ...currentMatch,
      team1_score: updatedScore1,
      team2_score: updatedScore2,
    });

    const eventDef = sportEventTypesMap[currentMatch.sport]?.find(def => def.type === currentEventType);
    const scoringPlayer = players.find(p => p.id === eventPlayerId);
    const scoringTeam = teams.find(t => t.id === eventTeamId);
    const scoreTerm = SPORT_SCORE_TERM_MAP[currentMatch.sport] || 'Puntos'; // Use sport-specific term

    if (eventDef?.affectsScore && eventDef.scorePoints) {
      if (scoringPlayer && scoringTeam) {
        const teamAbbr = scoringTeam.school.name.split(' ')[0];
        showNotification(
          `¡${eventDef.label} para ${teamAbbr} anotado por ${scoringPlayer.full_name}! Marcador: ${updatedScore1}-${updatedScore2} ${scoreTerm}`,
          'success'
        );
      }
    } else {
      const eventLabel = eventDef?.label || currentEventType;
      const team = teams.find(t => t.id === eventTeamId);
      const teamAbbr = team ? team.school.name.split(' ')[0] : 'Un equipo';
      showNotification(`Evento "${eventLabel}" registrado para ${teamAbbr}.`, 'info');
    }

    setIsEventModalOpen(false);
  }, [currentMatch, isEditor, currentEventType, eventTeamId, eventPlayerId, eventMinute, eventDetails, addEvent, updateMatch, players, teams, showNotification, calculateScoresFromEvents, sportEventTypesMap, events]); // Added `events` to dependencies for tempEventsForScoreCalc


  const handleRemoveEvent = useCallback(async (eventId: string) => {
    if (!isEditor || !currentMatch) return;
    const eventToRemove = events.find(e => e.id === eventId);
    if (!eventToRemove) return;

    if (window.confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      await removeEvent(eventId); // This will trigger a re-fetch in App.tsx

      // Re-calculate scores based on the `events` array *without* the removed event
      const tempEventsForScoreCalc = events.filter(e => e.id !== eventId);

      const updatedScore1 = calculateScoresFromEvents(currentMatch.id, currentMatch.team1_id, currentMatch.sport, tempEventsForScoreCalc);
      const updatedScore2 = calculateScoresFromEvents(currentMatch.id, currentMatch.team2_id, currentMatch.sport, tempEventsForScoreCalc);

      await updateMatch({
        ...currentMatch,
        team1_score: updatedScore1,
        team2_score: updatedScore2,
      });

      const eventDef = sportEventTypesMap[currentMatch.sport]?.find(def => def.type === eventToRemove.event_type);
      const affectedTeam = teams.find(t => t.id === eventToRemove.team_id);
      const teamAbbr = affectedTeam ? affectedTeam.school.name.split(' ')[0] : 'Un equipo';
      const scoreTerm = SPORT_SCORE_TERM_MAP[currentMatch.sport] || 'Puntos';

      if (eventDef?.affectsScore && eventDef.scorePoints) {
        showNotification(
          `Se ha revertido un ${eventDef.label.toLowerCase()} de ${teamAbbr}. Marcador: ${updatedScore1}-${updatedScore2} ${scoreTerm}`,
          'warning'
        );
      } else {
        showNotification(`Evento eliminado: ${eventDef?.label || eventToRemove.event_type}.`, 'info');
      }
    }
  }, [events, currentMatch, removeEvent, updateMatch, isEditor, teams, showNotification, calculateScoresFromEvents, sportEventTypesMap]);


  const sortedMatchEvents = useMemo(() => {
    return events
      .filter(event => event.match_id === activeMatchId)
      .sort((a, b) => a.minute - b.minute);
  }, [events, activeMatchId]);

  const team1Players = useMemo(() => players.filter(p => p.team_id === team1?.id), [players, team1]);
  const team2Players = useMemo(() => players.filter(p => p.team_id === team2?.id), [players, team2]);
  const selectedTeamPlayers = useMemo(() => {
    if (eventTeamId === team1?.id) return team1Players;
    if (eventTeamId === team2?.id) return team2Players;
    return [];
  }, [eventTeamId, team1Players, team2Players, team1, team2]);

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const allEditableMatches = useMemo(() => {
    return matches.filter(m => m.status === MatchStatus.EN_VIVO || m.status === MatchStatus.PROGRAMADO)
      .map(m => {
        const t1 = teams.find(t => t.id === m.team1_id);
        const t2 = teams.find(t => t.id === m.team2_id);
        return (t1 && t2) ? { match: m, team1: t1, team2: t2 } : null;
      })
      .filter(Boolean) as FullMatchData[];
  }, [matches, teams]);

  // --- Render Overview Mode ---
  if (!activeMatchId) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Partidos en Vivo (Modo Editor)</h1>
        {!isEditor && (
          <p className="mb-6 text-sm text-yellow-700 bg-yellow-100 p-3 rounded-md" role="alert" aria-live="polite">
            Solo los editores pueden controlar y registrar eventos en partidos. Puedes ver los partidos en curso, pero no interactuar con ellos.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allEditableMatches.length > 0 ? (
            allEditableMatches.map(({ match, team1, team2 }) => (
              <div key={match.id} className="card p-4 flex flex-col justify-between">
                <MatchCard
                  match={match}
                  team1={team1}
                  team2={team2}
                  onClick={() => isEditor && onNavigate('liveScoring', { matchId: match.id })} // Only allow click to detail if editor
                  showScore={true}
                  onNavigate={onNavigate} // Pass onNavigate for deep links from MatchCard
                />
                {isEditor && (
                  <div className="flex justify-around mt-4 pt-3 border-t border-gray-200">
                    <Button
                      variant={match.status === MatchStatus.EN_VIVO ? 'danger' : 'success'}
                      onClick={(e) => { e.stopPropagation(); handleUpdateMatchStatus(match, match.status === MatchStatus.EN_VIVO ? MatchStatus.PROGRAMADO : MatchStatus.EN_VIVO); }}
                      className="text-sm px-3 py-1"
                      aria-label={match.status === MatchStatus.EN_VIVO ? `Pausar partido ${team1.name} vs ${team2.name}` : `Iniciar partido ${team1.name} vs ${team2.name}`}
                    >
                      {match.status === MatchStatus.EN_VIVO ? 'Pausar' : 'Iniciar'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); handleUpdateMatchStatus(match, MatchStatus.FINALIZADO); }}
                      className="text-sm px-3 py-1"
                      aria-label={`Finalizar partido ${team1.name} vs ${team2.name}`}
                    >
                      Finalizar
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-600">No hay partidos en vivo o programados actualmente.</p>
          )}
        </div>
      </div>
    );
  }

  // --- Render Detail Mode ---
  if (!currentMatch || !team1 || !team2) {
    // Should not happen if logic is correct, but good for fallback
    return (
      <div className="container mx-auto p-4 text-center text-gray-600">
        <p>Cargando detalles del partido o el partido no existe.</p>
        <Button onClick={onCloseLiveScoring} className="mt-4">Volver a Partidos en Vivo</Button>
      </div>
    );
  }

  const sportEvents = sportEventTypesMap[currentMatch.sport];

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="card p-6 mb-6">
        {/* Header de partido */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-700">{team1.school.name} vs {team2.school.name}</h2>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-2">
            {team1.name.split(' ')[0]} <span className="text-gray-400 mx-2">-</span> {team2.name.split(' ')[0]}
          </h1>
          <div className="flex items-center space-x-4 mt-4">
            <span className="text-6xl md:text-7xl font-extrabold text-gray-800">{currentMatch.team1_score}</span>
            <span className="text-5xl md:text-6xl text-gray-400">-</span>
            <span className="6xl md:text-7xl font-extrabold text-gray-800">{currentMatch.team2_score}</span>
          </div>
          <div className="text-3xl md:text-4xl font-mono text-gray-800 mt-4 bg-gray-100 px-4 py-2 rounded-lg shadow-inner">
            {formatTimer(currentMatch.live_timer_seconds || 0)}
          </div>
          <div className="flex space-x-3 mt-6">
            <Button
              onClick={handleStartPauseTimer}
              variant={timerRunning ? 'danger' : 'success'}
              disabled={currentMatch.status === MatchStatus.FINALIZADO || !isEditor}
              aria-disabled={!isEditor}
            >
              {timerRunning ? 'Pausar Partido' : 'Iniciar/Reanudar Partido'}
            </Button>
            <Button
              onClick={handleFinishMatch}
              variant="secondary"
              disabled={currentMatch.status === MatchStatus.FINALIZADO || !isEditor}
              aria-disabled={!isEditor}
            >
              Finalizar Partido
            </Button>
            <Button
              onClick={onCloseLiveScoring} // Go back to overview
              variant="info"
              className="px-6"
            >
              Volver a Partidos en Vivo
            </Button>
          </div>
          {!isEditor && (
            <p className="mt-4 text-sm text-yellow-700 bg-yellow-100 p-2 rounded-md" role="alert" aria-live="polite">
              Necesitas rol de 'Editor' para controlar el partido y registrar eventos.
            </p>
          )}
        </div>

        {/* Botones de eventos */}
        {isEditor && currentMatch.status === MatchStatus.EN_VIVO && sportEvents && sportEvents.length > 0 && (
          <div className="border-t pt-6 mt-6 border-gray-200">
            <h3 className="2xl font-bold text-gray-800 mb-4">Anotar Evento:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sportEvents.map(eventDef => (
                <SportEventButton
                  key={eventDef.type}
                  icon={eventDef.icon}
                  label={eventDef.label}
                  onClick={() => handleEventButtonClick(eventDef.type)}
                  disabled={!isEditor || !timerRunning}
                />
              ))}
            </div>
          </div>
        )}
        {!isEditor && currentMatch.status === MatchStatus.EN_VIVO && (
          <p className="mt-4 text-sm text-yellow-700 bg-yellow-100 p-2 rounded-md">
            El partido está en vivo, pero no puedes registrar eventos con tu rol de espectador.
          </p>
        )}
        {currentMatch.status === MatchStatus.PROGRAMADO && (
          <p className="mt-4 text-sm text-blue-700 bg-blue-100 p-2 rounded-md" role="alert" aria-live="polite">
            El partido está programado. Inícialo para registrar eventos.
          </p>
        )}
        {currentMatch.status === MatchStatus.FINALIZADO && (
          <p className="mt-4 text-sm text-green-700 bg-green-100 p-2 rounded-md" role="alert" aria-live="polite">
            El partido ha finalizado. No se pueden registrar más eventos.
          </p>
        )}

        {/* Timeline de eventos */}
        <div className="border-t pt-6 mt-8 border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Timeline de Eventos</h3>
          <div className="relative border-l-4 border-gray-200 ml-4 pl-4 md:ml-8 md:pl-8">
            {sortedMatchEvents.length === 0 && (
              <p className="text-gray-600 text-center py-4">No hay eventos registrados para este partido.</p>
            )}
            {sortedMatchEvents.map(event => {
              const eventPlayer = players.find(p => p.id === event.player_id);
              const eventTeam = teams.find(t => t.id === event.team_id);
              const eventDef = sportEventTypesMap[currentMatch.sport]?.find(def => def.type === event.event_type);

              const isTeam1Event = event.team_id === team1.id;

              return (
                <div key={event.id} className={`mb-6 flex ${isTeam1Event ? 'flex-row' : 'flex-row-reverse'} items-start`}>
                  <div className={`absolute w-4 h-4 rounded-full ${isTeam1Event ? '-left-2 bg-primary' : '-left-2 bg-secondary'}`}></div>
                  <div className={`flex-1 card p-4 border-l-4 ${isTeam1Event ? 'ml-8 md:ml-12 border-primary' : 'mr-8 md:mr-12 border-secondary'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-800 flex items-center">
                        <span className="text-lg mr-2">{eventDef?.icon}</span> {eventDef?.label || event.event_type}
                      </span>
                      <span className="text-sm text-gray-500">{event.minute}'</span>
                    </div>
                    <p className="text-gray-700">
                      {eventPlayer?.full_name} {eventPlayer?.jersey_number !== undefined ? `(#${eventPlayer.jersey_number})` : ''} ({eventTeam?.name.split(' ')[0]})
                    </p>
                    {event.details?.text && (
                      <p className="text-sm text-gray-600 italic mt-1">{event.details.text}</p>
                    )}
                    {isEditor && (
                      <Button
                        variant="danger"
                        onClick={() => handleRemoveEvent(event.id)}
                        className="mt-2 px-3 py-1 text-sm"
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={`Registrar ${sportEventTypesMap[currentMatch.sport]?.find(def => def.type === currentEventType)?.label || currentEventType}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEventModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveEvent} disabled={!isEditor}>Guardar Evento</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Dropdown
            options={[
              { value: '', label: 'Seleccionar Equipo' },
              { value: team1.id, label: `${team1.school.name} - ${team1.name}` },
              { value: team2.id, label: `${team2.school.name} - ${team2.name}` },
            ]}
            value={eventTeamId}
            onChange={setEventTeamId}
            placeholder="Seleccionar Equipo"
            className="w-full"
            disabled={!isEditor}
          />
          <PlayerSelect
            players={selectedTeamPlayers}
            selectedPlayerId={eventPlayerId}
            onChange={setEventPlayerId}
            placeholder="Seleccionar Jugador"
            className="w-full"
            disabled={!isEditor}
          />
          <input
            type="number"
            placeholder="Minuto del partido (ej: 23')"
            value={eventMinute}
            onChange={(e) => setEventMinute(parseInt(e.target.value))}
            min="1"
            className="p-2 border border-gray-300 rounded-md w-full"
            disabled={!isEditor}
          />
          <textarea
            placeholder="Detalles adicionales (opcional)"
            value={eventDetails}
            onChange={(e) => setEventDetails(e.target.value)}
            rows={3}
            className="p-2 border border-gray-300 rounded-md w-full"
            disabled={!isEditor}
          />
        </div>
      </Modal>
    </div>
  );
};

export default LiveScoring;