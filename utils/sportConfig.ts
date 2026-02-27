
import { Sport, EventType } from '../types';

interface SportEventDefinition {
  type: EventType;
  label: string;
  icon: string;
  affectsScore?: boolean;
  scorePoints?: number; // How many points this event adds
  supabaseEventType: string; // Supabase event type string
}

export const SPORT_EVENT_TYPES_MAP: Record<Sport, SportEventDefinition[]> = {
  [Sport.FUTBOL]: [
    { type: EventType.GOL, label: 'Gol', icon: '⚽', affectsScore: true, scorePoints: 1, supabaseEventType: 'goal' },
    { type: EventType.ASISTENCIA_FUTBOL, label: 'Asistencia', icon: '🎯', supabaseEventType: 'assist_football' },
    { type: EventType.TARJETA_AMARILLA, label: 'Tarjeta Amarilla', icon: '🟨', supabaseEventType: 'yellow_card' },
    { type: EventType.TARJETA_ROJA, label: 'Tarjeta Roja', icon: '🟥', supabaseEventType: 'red_card' },
    { type: EventType.SUSTITUCION_FUTBOL, label: 'Sustitución', icon: '🔄', supabaseEventType: 'substitution_football' },
    { type: EventType.PENAL, label: 'Penal', icon: '⏸️', affectsScore: true, scorePoints: 1, supabaseEventType: 'penalty' }, // Penalty can be a goal
  ],
  [Sport.BALONCESTO]: [
    { type: EventType.CANASTA_1PT, label: 'Canasta 1pt', icon: '🏀', affectsScore: true, scorePoints: 1, supabaseEventType: 'basket_1pt' },
    { type: EventType.CANASTA_2PTS, label: 'Canasta 2pts', icon: '🏀', affectsScore: true, scorePoints: 2, supabaseEventType: 'basket_2pts' },
    { type: EventType.CANASTA_3PTS, label: 'Canasta 3pts', icon: '🏀', affectsScore: true, scorePoints: 3, supabaseEventType: 'basket_3pts' },
    { type: EventType.ASISTENCIA_BALONCESTO, label: 'Asistencia', icon: '🎯', supabaseEventType: 'assist_basketball' },
    { type: EventType.SUSTITUCION_BALONCESTO, label: 'Sustitución', icon: '🔄', supabaseEventType: 'substitution_basketball' },
    { type: EventType.FALTA_PERSONAL, label: 'Falta Personal', icon: '❌', supabaseEventType: 'personal_foul' }, // New
    { type: EventType.FALTA_TECNICA, label: 'Falta Técnica', icon: '🚫', supabaseEventType: 'technical_foul' }, // New
  ],
  [Sport.VOLEIBOL]: [
    { type: EventType.PUNTO_VOLEIBOL, label: 'Punto', icon: '🏐', affectsScore: true, scorePoints: 1, supabaseEventType: 'point_volleyball' },
    { type: EventType.ACE, label: 'Ace (Saque directo)', icon: '🎯', affectsScore: true, scorePoints: 1, supabaseEventType: 'ace' },
    { type: EventType.BLOQUEO, label: 'Bloqueo', icon: '🚫', supabaseEventType: 'block' },
    { type: EventType.SUSTITUCION_VOLEIBOL, label: 'Sustitución', icon: '🔄', supabaseEventType: 'substitution_volleyball' },
    { type: EventType.ERROR_VOLEIBOL, label: 'Error', icon: '❌', supabaseEventType: 'error_volleyball' }, // New
  ],
  [Sport.NATACION]: [
    { type: EventType.REGISTRAR_TIEMPO, label: 'Registrar Tiempo', icon: '⏱️', supabaseEventType: 'register_time' },
    { type: EventType.POSICION_FINAL_NATACION, label: 'Posición Final', icon: '🥇', supabaseEventType: 'final_position_swimming' },
  ],
  [Sport.TENIS]: [
    { type: EventType.PUNTO_TENIS_PADEL, label: 'Punto', icon: '🎾', affectsScore: true, scorePoints: 1, supabaseEventType: 'point_tennis_padel' }, // Points in tennis are game-points
    { type: EventType.ACE_TENIS_PADEL, label: 'Ace', icon: '🎯', affectsScore: false, scorePoints: 0, supabaseEventType: 'ace_tennis_padel' }, // Ace contributes to point but not a standalone score event
    { type: EventType.GAME_GANADO, label: 'Game Ganado', icon: '🎮', affectsScore: false, scorePoints: 0, supabaseEventType: 'game_won' },
    { type: EventType.SET_GANADO, label: 'Set Ganado', icon: '🏆', affectsScore: false, scorePoints: 0, supabaseEventType: 'set_won' },
  ],
  [Sport.PADEL]: [
    { type: EventType.PUNTO_TENIS_PADEL, label: 'Punto', icon: '🎾', affectsScore: true, scorePoints: 1, supabaseEventType: 'point_tennis_padel' }, // Points in padel are game-points
    { type: EventType.ACE_TENIS_PADEL, label: 'Ace', icon: '🎯', affectsScore: false, scorePoints: 0, supabaseEventType: 'ace_tennis_padel' },
    { type: EventType.GAME_GANADO, label: 'Game Ganado', icon: '🎮', affectsScore: false, scorePoints: 0, supabaseEventType: 'game_won' },
    { type: EventType.SET_GANADO, label: 'Set Ganado', icon: '🏆', affectsScore: false, scorePoints: 0, supabaseEventType: 'set_won' },
  ],
  [Sport.SOFTBOL]: [
    { type: EventType.GOL, label: 'Carrera', icon: '⚾', affectsScore: true, scorePoints: 1, supabaseEventType: 'goal' }, // Using GOL type with 'Carrera' label for score tracking
    { type: EventType.ASISTENCIA_FUTBOL, label: 'Asistencia (Softbol)', icon: '🎯', supabaseEventType: 'assist_football' }, // Reusing football assist, but with specific label
    { type: EventType.SUSTITUCION_FUTBOL, label: 'Sustitución (Softbol)', icon: '🔄', supabaseEventType: 'substitution_football' }, // Reusing football substitution
  ],
  [Sport.AJEDREZ]: [], // No live scoring events
  [Sport.GIMNASIA]: [], // No live scoring events
  [Sport.GOLF]: [], // No live scoring events
  [Sport.EQUITACION]: [], // No live scoring events
};

// Map to determine the primary scoring term for each sport (e.g., 'Goles', 'Puntos', 'Carreras')
export const SPORT_SCORE_TERM_MAP: Record<Sport, string> = {
  [Sport.FUTBOL]: 'Goles',
  [Sport.BALONCESTO]: 'Puntos',
  [Sport.VOLEIBOL]: 'Puntos',
  [Sport.NATACION]: 'Tiempos', // Not a score, but a primary metric
  [Sport.TENIS]: 'Puntos', // Score in tennis is more about games/sets, but for simple counting, points per game.
  [Sport.PADEL]: 'Puntos', // Score in padel is more about games/sets, but for simple counting, points per game.
  [Sport.SOFTBOL]: 'Carreras', // Updated to 'Carreras'
  [Sport.AJEDREZ]: 'Victorias', // Or a general standing
  [Sport.GIMNASIA]: 'Puntos',
  [Sport.GOLF]: 'Golpes', // Or a general standing
  [Sport.EQUITACION]: 'Puntos',
};

// Map to define which events count towards the primary 'score' for PlayerStats
export const PRIMARY_SCORING_EVENT_TYPES_MAP: Record<Sport, EventType[]> = {
  [Sport.FUTBOL]: [EventType.GOL, EventType.PENAL],
  [Sport.BALONCESTO]: [EventType.CANASTA_1PT, EventType.CANASTA_2PTS, EventType.CANASTA_3PTS],
  [Sport.VOLEIBOL]: [EventType.PUNTO_VOLEIBOL, EventType.ACE],
  [Sport.NATACION]: [], // No direct "scoring" in the same sense
  [Sport.TENIS]: [EventType.PUNTO_TENIS_PADEL], // Only direct points count as primary score
  [Sport.PADEL]: [EventType.PUNTO_TENIS_PADEL], // Only direct points count as primary score
  [Sport.SOFTBOL]: [EventType.GOL], // 'Carrera' uses GOL type for score
  [Sport.AJEDREZ]: [],
  [Sport.GIMNASIA]: [],
  [Sport.GOLF]: [],
  [Sport.EQUITACION]: [],
};
