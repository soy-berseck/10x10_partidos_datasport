export enum MatchStatus {
  PROGRAMADO = 'Programado',
  EN_VIVO = 'En Vivo',
  FINALIZADO = 'Finalizado',
  PENDIENTE = 'Pendiente',
}

export enum Sport {
  FUTBOL = 'Fútbol',
  BALONCESTO = 'Baloncesto',
  VOLEIBOL = 'Voleibol',
  FUTBOL_7 = 'Fútbol 7',
}

export enum Category {
  _2007_09 = '2007-09',
  _2010_11 = '2010-11',
  _2012_13 = '2012-13',
}

export enum Gender {
  MASCULINO = 'Masculino',
  FEMENINO = 'Femenino',
}

export interface SchoolData {
  id: string;
  name: string;
}

export interface SportData {
  id: string;
  name: Sport;
}

export interface CategoryData {
  id: string;
  name: Category;
  sport_id: string; // Link to SportData
}

export interface Team {
  id: string;
  name: string;
  school_id: string;
  sport_id: string;
  category_id: string;
  gender: Gender;
  school: SchoolData;
  sport: SportData;
  category: CategoryData;
}

export interface Player {
  id: string;
  full_name: string;
  team_id: string;
  team: Team;
  photo_url?: string;
  birth_date?: string;
  document_id?: string;
  jersey_number?: number;
  grade?: string;
  eps?: string;
}

export interface Match {
  id: string;
  sport: Sport;
  category: Category;
  gender: Gender;
  team1_id: string;
  team2_id: string;
  team1_score: number;
  team2_score: number;
  match_date: string; // ISO string
  location: string;
  status: MatchStatus;
}

export interface Event {
  id: string;
  match_id: string;
  player_id?: string;
  team_id: string;
  event_type: string;
  value: number;
  timestamp: string;
}

export interface FilterOptions {
  sport?: Sport | 'all';
  category?: Category | 'all';
  gender?: Gender | 'all';
  school?: string | 'all'; // School name
  date?: string; // YYYY-MM-DD
}

export interface FullMatchData {
  match: Match;
  team1: Team;
  team2: Team;
  events: Event[];
}

export interface PlayerStats {
  playerId: string;
  name: string;
  teamName: string;
  school: string;
  score: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  totalCards: number;
  matchesPlayed: number;
  photo: string;
}

export interface PlayerScoreSummary {
  playerId: string;
  name: string;
  teamName: string;
  school: string;
  score: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  totalCards: number;
  matchesPlayed: number;
  photo: string;
}

export const mapToSupabaseMatchStatus = (status: MatchStatus): string => {
  switch (status) {
    case MatchStatus.PROGRAMADO: return 'scheduled';
    case MatchStatus.EN_VIVO: return 'live';
    case MatchStatus.FINALIZADO: return 'finished';
    case MatchStatus.PENDIENTE: return 'pending';
    default: return 'unknown';
  }
};

// LLM Generated Types for Tournament Data
export interface TournamentTeam {
  name: string;
  school: string;
  cant: number;
}

export interface TournamentGroup {
  sport: Sport;
  gender: Gender;
  category: Category;
  teams: TournamentTeam[];
  grouping: string; // e.g., "Se realizarán dos grupos de 4 colegios"
  matchesPerGroup: number; // e.g., 3 partidos del mismo grupo
  interGroupMatches?: number; // e.g., 2 partidos intergrupos
  locations: string[];
  dates: {
    date: string;
    startTime: string;
    endTime: string;
  }[];
  durationPerMatch?: string; // e.g., "cada hora y 10 minutos"
  restTime?: string; // e.g., "al menos una hora de descanso"
  setsToWin?: number; // Voleibol
  pointsPerSet?: number; // Voleibol
  tieBreakPoints?: number; // Voleibol
}

export interface TournamentSchedule {
  tournamentGroups: TournamentGroup[];
}

export type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players' | 'registerTeamsPlayers';
