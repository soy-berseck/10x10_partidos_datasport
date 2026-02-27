


export enum Sport {
  FUTBOL = 'Fútbol',
  BALONCESTO = 'Baloncesto',
  VOLEIBOL = 'Voleibol',
  NATACION = 'Natación',
  TENIS = 'Tenis',
  PADEL = 'Pádel',
  SOFTBOL = 'Softbol',
  AJEDREZ = 'Ajedrez',
  GIMNASIA = 'Gimnasia',
  GOLF = 'Golf',
  EQUITACION = 'Equitación',
}

export type Category = string; // Ahora Category es un string para permitir valores dinámicos

export enum Gender {
  MASCULINO = 'Masculino',
  FEMENINO = 'Femenino',
  MIXTO = 'Mixto',
}

export enum MatchStatus {
  PROGRAMADO = 'Programado', // 'scheduled' in Supabase
  EN_VIVO = 'En Vivo',       // 'live' in Supabase
  FINALIZADO = 'Finalizado', // 'finished' in Supabase
}

// Helper to map Supabase string status to enum
export const mapSupabaseMatchStatus = (status: string): MatchStatus => {
  switch (status) {
    case 'scheduled': return MatchStatus.PROGRAMADO;
    case 'live': return MatchStatus.EN_VIVO;
    case 'finished': return MatchStatus.FINALIZADO;
    default: return MatchStatus.PROGRAMADO; // Default or handle error
  }
};

// Helper to map enum status to Supabase string
export const mapToSupabaseMatchStatus = (status: MatchStatus): string => {
  switch (status) {
    case MatchStatus.PROGRAMADO: return 'scheduled';
    case MatchStatus.EN_VIVO: return 'live';
    case MatchStatus.FINALIZADO: return 'finished';
  }
};

export interface SchoolData {
  id: string; // Assuming schools have IDs
  name: string;
  logo_url?: string; // Nuevo: URL del logo del colegio
}

export interface SportData {
  id: string; // Assuming sports have IDs
  name: Sport; // Use Sport enum directly
}

export interface CategoryData {
  id: string; // Assuming categories have IDs
  name: Category; // Use Category type (string) directly
  gender: Gender; // Gender is part of category in Supabase join example
  sport_id: string; // Link to sport
}

export interface Team {
  id: string;
  name: string;
  school: SchoolData; // Changed to object for Supabase join
  sport: SportData; // Changed to object for Supabase join
  category: CategoryData; // Changed to object for Supabase join
  gender: Gender; // Keep for convenience, but can be derived from category.gender
}

export interface Player {
  id: string;
  full_name: string; // Supabase column name
  jersey_number?: number; // Supabase column name, Optional for individual sports
  team_id: string; // Supabase column name
  photo_url: string; // Supabase column name
}

export interface Match {
  id: string;
  sport: Sport; // Direct string from Supabase table or mapped from sport_id. Assuming direct enum string.
  category: Category; // Direct string from Supabase table or mapped from category_id.
  gender: Gender; // Direct string from Supabase table or mapped from gender_id.
  team1_id: string; // Supabase column name
  team2_id: string; // Supabase column name
  team1: { school: SchoolData }; // Changed to object for Supabase join
  team2: { school: SchoolData }; // Changed to object for Supabase join
  match_date: string; // ISO 8601 string, e.g., "YYYY-MM-DDTHH:mm"
  location: string;
  status: MatchStatus; // Mapped from 'scheduled', 'live', 'finished'
  team1_score: number; // Supabase column name
  team2_score: number; // Supabase column name
  live_timer_seconds?: number; // Supabase column name, Current timer in seconds for live matches
  start_time_timestamp?: number; // Supabase column name, Timestamp when match started (for calculating liveTimer)
}

export enum EventType {
  // Football
  GOL = 'Gol', // 'goal' in Supabase
  ASISTENCIA_FUTBOL = 'Asistencia (Fútbol)', // 'assist_football'
  TARJETA_AMARILLA = 'Tarjeta Amarilla', // 'yellow_card'
  TARJETA_ROJA = 'Tarjeta Roja', // 'red_card'
  SUSTITUCION_FUTBOL = 'Sustitución (Fútbol)', // 'substitution_football'
  PENAL = 'Penal', // 'penalty'

  // Basketball
  CANASTA_1PT = 'Canasta 1pt', // 'basket_1pt'
  CANASTA_2PTS = 'Canasta 2pts', // 'basket_2pts'
  CANASTA_3PTS = 'Canasta 3pts', // 'basket_3pts'
  ASISTENCIA_BALONCESTO = 'Asistencia (Baloncesto)', // 'assist_basketball'
  SUSTITUCION_BALONCESTO = 'Sustitución (Baloncesto)', // 'substitution_basketball'
  FALTA_PERSONAL = 'Falta Personal', // 'personal_foul'
  FALTA_TECNICA = 'Falta Técnica', // 'technical_foul'

  // Volleyball
  PUNTO_VOLEIBOL = 'Punto (Voleibol)', // 'point_volleyball'
  ACE = 'Ace (Saque Directo)', // 'ace'
  BLOQUEO = 'Bloqueo', // 'block'
  SUSTITUCION_VOLEIBOL = 'Sustitución (Voleibol)', // 'substitution_volleyball'
  ERROR_VOLEIBOL = 'Error (Voleibol)', // 'error_volleyball'

  // Swimming
  REGISTRAR_TIEMPO = 'Registrar Tiempo', // 'register_time'
  POSICION_FINAL_NATACION = 'Posición Final (Natación)', // 'final_position_swimming'

  // Tennis / Padel
  PUNTO_TENIS_PADEL = 'Punto (Tenis/Pádel)', // 'point_tennis_padel'
  ACE_TENIS_PADEL = 'Ace (Tenis/Pádel)', // 'ace_tennis_padel'
  GAME_GANADO = 'Game Ganado', // 'game_won'
  SET_GANADO = 'Set Ganado', // 'set_won'
}

// Helper to map Supabase string event_type to enum
export const mapSupabaseEventType = (eventType: string): EventType => {
  switch (eventType) {
    case 'goal': return EventType.GOL;
    case 'assist_football': return EventType.ASISTENCIA_FUTBOL;
    case 'yellow_card': return EventType.TARJETA_AMARILLA;
    case 'red_card': return EventType.TARJETA_ROJA;
    case 'substitution_football': return EventType.SUSTITUCION_FUTBOL;
    case 'penalty': return EventType.PENAL;
    case 'basket_1pt': return EventType.CANASTA_1PT;
    case 'basket_2pts': return EventType.CANASTA_2PTS;
    case 'basket_3pts': return EventType.CANASTA_3PTS;
    case 'assist_basketball': return EventType.ASISTENCIA_BALONCESTO;
    case 'substitution_basketball': return EventType.SUSTITUCION_BALONCESTO;
    case 'personal_foul': return EventType.FALTA_PERSONAL; // New
    case 'technical_foul': return EventType.FALTA_TECNICA; // New
    case 'point_volleyball': return EventType.PUNTO_VOLEIBOL;
    case 'ace': return EventType.ACE;
    case 'block': return EventType.BLOQUEO;
    case 'substitution_volleyball': return EventType.SUSTITUCION_VOLEIBOL;
    case 'error_volleyball': return EventType.ERROR_VOLEIBOL; // New
    case 'register_time': return EventType.REGISTRAR_TIEMPO;
    case 'final_position_swimming': return EventType.POSICION_FINAL_NATACION;
    case 'point_tennis_padel': return EventType.PUNTO_TENIS_PADEL;
    case 'ace_tennis_padel': return EventType.ACE_TENIS_PADEL;
    case 'game_won': return EventType.GAME_GANADO;
    case 'set_won': return EventType.SET_GANADO;
    case 'run_softbol': return EventType.GOL; // Mapped 'run_softbol' to GOL for score tracking
    default: return EventType.GOL; // Default or handle unknown
  }
};

// Helper to map enum eventType to Supabase string
export const mapToSupabaseEventType = (eventType: EventType): string => {
  switch (eventType) {
    case EventType.GOL: return 'goal';
    case EventType.ASISTENCIA_FUTBOL: return 'assist_football';
    case EventType.TARJETA_AMARILLA: return 'yellow_card';
    case EventType.TARJETA_ROJA: return 'red_card';
    case EventType.SUSTITUCION_FUTBOL: return 'substitution_football';
    case EventType.PENAL: return 'penalty';
    case EventType.CANASTA_1PT: return 'basket_1pt';
    case EventType.CANASTA_2PTS: return 'basket_2pts';
    case EventType.CANASTA_3PTS: return 'basket_3pts';
    case EventType.ASISTENCIA_BALONCESTO: return 'assist_basketball';
    case EventType.SUSTITUCION_BALONCESTO: return 'substitution_basketball';
    case EventType.FALTA_PERSONAL: return 'personal_foul'; // New
    case EventType.FALTA_TECNICA: return 'technical_foul'; // New
    case EventType.PUNTO_VOLEIBOL: return 'point_volleyball';
    case EventType.ACE: return 'ace';
    case EventType.BLOQUEO: return 'block';
    case EventType.SUSTITUCION_VOLEIBOL: return 'substitution_volleyball';
    case EventType.ERROR_VOLEIBOL: return 'error_volleyball'; // New
    case EventType.REGISTRAR_TIEMPO: return 'register_time';
    case EventType.POSICION_FINAL_NATACION: return 'final_position_swimming';
    case EventType.PUNTO_TENIS_PADEL: return 'point_tennis_padel';
    case EventType.ACE_TENIS_PADEL: return 'ace_tennis_padel';
    case EventType.GAME_GANADO: return 'game_won';
    case EventType.SET_GANADO: return 'set_won';
    // case EventType.GOL from Softbol: return 'run_softbol'; // Handle special case if GOL needs different string for softbol
    default: return 'unknown';
  }
};


export interface Event {
  id: string;
  match_id: string; // Supabase column name
  event_type: EventType; // Mapped from string in Supabase
  player_id?: string; // Supabase column name
  team_id: string; // Supabase column name
  minute: number;
  details?: { [key: string]: any };
}

export interface FullMatchData {
  match: Match;
  team1: Team;
  team2: Team;
  events: Event[];
}

export interface User {
  id: string;
  username: string;
  role: 'viewer' | 'editor';
}

// New interface for sport-specific player stats
export interface PlayerSportStats {
  sport: Sport;
  score: number; // Primary scoring metric (goals, points, runs)
  assists: number; // Assists
  scoreTerm: string;
  assistTerm: string;
  matchesPlayedInSport: number;

  // Additional sport-specific metrics
  threePointers?: number;    // Baloncesto: Contar triples
  personalFouls?: number;   // Baloncesto: Faltas personales
  technicalFouls?: number;  // Baloncesto: Faltas técnicas
  blocks?: number;          // Voleibol: Bloqueos
  acesCount?: number;       // Voleibol: Conteo de Aces (saques directos)
  errors?: number;          // Voleibol: Errores
}

export interface PlayerStats {
  playerId: string;
  name: string;
  teamName: string;
  school: string;
  // General card stats
  yellowCards: number;
  redCards: number;
  totalCards: number;
  matchesPlayed: number; // Overall matches played (any sport)
  photo: string;
  // Detailed stats per sport
  sportStats: PlayerSportStats[];
}

// New interface for summarized player stats, useful for top lists where a single score/assist is displayed
export interface PlayerScoreSummary {
  playerId: string;
  name: string;
  teamName: string;
  school: string;
  photo: string;
  score: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  totalCards: number;
  matchesPlayed: number; // For consistency in summary, can be omitted if not needed for specific lists
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  school: string;
  sport: Sport;
  category: Category;
  gender: Gender;
  matchesPlayed: number; // PJ
  wins: number; // PG
  draws: number; // PE
  losses: number; // PP
  goalsFor: number; // GF (now general 'scoreFor')
  goalsAgainst: number; // GC (now general 'scoreAgainst')
  goalDifference: number; // DIF (now general 'scoreDifference')
  points: number; // PTS
}

export interface FilterOptions {
  sport?: Sport | 'all';
  category?: Category | 'all';
  gender?: Gender | 'all';
  school?: string | 'all';
  date?: string | 'all'; // For specific date filtering
  startDate?: string; // For date range filtering
  endDate?: string;
}

// Global Page type
export type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players' | 'registerTeamsPlayers' | 'generateSchedule';

// --- New Types for Scheduling --- 

export interface Court {
  id: string; // Unique identifier for the court
  name: string;
  location: string; // Full address/description
  sports: Sport[]; // Array of sports playable at this court
  // Optional: specific court numbers/names if a venue has multiple fields for the same sport
  subCourts?: string[]; 
}

export interface TimeSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  courtId: string; // Link to Court.id
  subCourtName?: string; // If a court has multiple sub-courts (e.g., 'Monómeros 1')
}

export interface SchedulingRule {
  sport: Sport;
  category: Category;
  gender: Gender;
  groupCount: number; // Number of groups (e.g., 2 groups of 4)
  teamsPerGroup: number; // Number of teams per group
  matchesPerTeamInGroup: number; // Matches played within the same group
  interGroupMatchesPerTeam?: number; // Matches played against teams from other groups
  playoffStructure?: 'semis_final' | 'final_only' | 'position_playoffs'; // e.g., 'semis_final'
  specificCourts?: { courtId: string; subCourtName?: string }[]; // Specific courts assigned to this rule
  availableTimeSlots?: TimeSlot[]; // Specific time slots for this rule, if any
  matchDurationMinutes: number; // Duration of a single match in minutes
  restBetweenMatchesMinutes: number; // Minimum rest for a team between matches on the same day
  maxConsecutiveMatches?: number; // Max matches a team can play consecutively
  notes?: string; // Any additional notes or special conditions
}