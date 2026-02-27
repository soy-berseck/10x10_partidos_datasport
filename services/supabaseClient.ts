
import { createClient } from '@supabase/supabase-js';
import { MatchStatus, EventType, mapSupabaseMatchStatus, mapSupabaseEventType, Match, Team, Player, Event, Sport, Category, Gender, SchoolData, SportData, CategoryData } from '../types';
// No longer import from constants.ts, as it's removed.

// STEP 2 - Supabase Configuration
const SUPABASE_URL = 'https://ytrtbqtbzdnhedwcdxkj.supabase.co';
// Reemplazado process.env.API_KEY por la clave anon pública directamente, según la solicitud del usuario.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cnRicXRiemRuaGVkd2NkeGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3Njc3NzQsImV4cCI6MjA4NjM0Mzc3NH0.2pEp_9LFrNA4X1d4cRSUq1QKAoVVOLq5lalKvV41rJ8'; 

// Create a single Supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Generates a unique ID (simple UUID-like string).
 * @returns A unique string ID.
 */
export const generateUuid = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};


// --- Supabase Data Mappers ---

// Mapea la respuesta de la API de Supabase para Equipos a la interfaz Team
export const mapSupabaseTeamToAppTeam = (supabaseTeam: any): Team => {
  // Ensure school and sport names are available for default team name construction
  const schoolName = supabaseTeam.school?.name || 'Colegio Desconocido';
  const sportName = (supabaseTeam.sport?.name as Sport) || Sport.FUTBOL;

  const defaultTeamName = `${schoolName} - ${sportName}`;

  const mappedTeam: Team = {
    id: supabaseTeam.id || '',
    name: supabaseTeam.name || defaultTeamName, // Updated default team name as requested
    school: {
      id: supabaseTeam.school?.id || '',
      name: schoolName, // Use the resolved schoolName
      logo_url: supabaseTeam.school?.logo_url || undefined,
    },
    sport: {
      id: supabaseTeam.sport?.id || '',
      name: sportName, // Use the resolved sportName
    },
    category: {
      id: supabaseTeam.category?.id || '',
      // Category name from the joined object, ensure it's a valid Category string or default
      name: (supabaseTeam.category?.name as Category) || 'General',
      // Gender from the joined category object, ensure it's a valid Gender enum member or default
      gender: (supabaseTeam.category?.gender as Gender) || Gender.MASCULINO,
      sport_id: supabaseTeam.category?.sport_id || '',
    },
    // Top-level gender derived from category, with a fallback
    gender: (supabaseTeam.category?.gender as Gender) || Gender.MASCULINO,
  };
  return mappedTeam;
};

// Mapea la respuesta de la API de Supabase para Jugadores a la interfaz Player
export const mapSupabasePlayerToAppPlayer = (supabasePlayer: any): Player => {
  const mappedPlayer: Player = {
    id: supabasePlayer.id || '',
    full_name: supabasePlayer.full_name || 'Jugador Desconocido', // Ensure full_name is string
    jersey_number: supabasePlayer.jersey_number,
    team_id: supabasePlayer.team_id || '',
    photo_url: supabasePlayer.photo_url || 'https://via.placeholder.com/60', // Default photo
  };
  return mappedPlayer;
};


// Mapea la respuesta de la API de Supabase para Partidos a la interfaz Match
export const mapSupabaseMatchToAppMatch = (supabaseMatch: any): Match => {
  const matchStatus = mapSupabaseMatchStatus(supabaseMatch.status || 'scheduled'); // Default status
  const mappedMatch: Match = {
    id: supabaseMatch.id || '',
    sport: (supabaseMatch.sport as Sport) || Sport.FUTBOL, // Assuming sport is stored as text matching enum
    category: (supabaseMatch.category as Category) || 'General', // Assuming category is stored as text matching enum
    gender: (supabaseMatch.gender as Gender) || Gender.MASCULINO, // Assuming gender is stored as text matching enum
    team1_id: supabaseMatch.team1_id || '',
    team2_id: supabaseMatch.team2_id || '',
    team1: {
      school: {
        id: supabaseMatch.team1?.school?.id || '',
        name: supabaseMatch.team1?.school?.name || 'Desconocido',
        logo_url: supabaseMatch.team1?.school?.logo_url || undefined, // Incluir logo_url
      },
    },
    team2: {
      school: {
        id: supabaseMatch.team2?.school?.id || '',
        name: supabaseMatch.team2?.school?.name || 'Desconocido',
        logo_url: supabaseMatch.team2?.school?.logo_url || undefined, // Incluir logo_url
      },
    },
    match_date: supabaseMatch.match_date || new Date().toISOString().slice(0, 16), // Default date
    location: supabaseMatch.location || 'Ubicación Desconocida',
    status: matchStatus,
    team1_score: supabaseMatch.team1_score || 0,
    team2_score: supabaseMatch.team2_score || 0,
    live_timer_seconds: supabaseMatch.live_timer_seconds || 0,
    start_time_timestamp: supabaseMatch.start_time_timestamp || undefined,
  };
  return mappedMatch;
};


// Mapea la respuesta de la API de Supabase para Eventos a la interfaz Event
export const mapSupabaseEventToAppEvent = (supabaseEvent: any): Event => {
  const mappedEvent: Event = {
    id: supabaseEvent.id || '',
    match_id: supabaseEvent.match_id || '',
    event_type: mapSupabaseEventType(supabaseEvent.event_type || 'goal'), // Mapea el string a enum
    player_id: supabaseEvent.player_id || undefined,
    team_id: supabaseEvent.team_id || '',
    minute: supabaseEvent.minute || 0,
    details: supabaseEvent.details || {},
  };
  return mappedEvent;
};

// Function to fetch all necessary IDs for team creation from Supabase
export const fetchSportCategoryGenderSchoolIDs = async (sportName: Sport, categoryName: Category, genderName: Gender, schoolName: string) => {
  let sportId: string | null = null;
  let categoryId: string | null = null;
  let schoolId: string | null = null;

  const { data: sportData, error: sportError } = await supabase.from('sports').select('id').eq('name', sportName).single();
  if (sportError) console.error('Error fetching sport ID:', sportError);
  if (sportData) sportId = sportData.id;

  // categoryName is now a string
  const { data: categoryData, error: categoryError } = await supabase.from('categories').select('id').eq('name', categoryName).eq('gender', genderName).single();
  if (categoryError) console.error('Error fetching category ID:', categoryError);
  if (categoryData) categoryId = categoryData.id;

  const { data: schoolData, error: schoolError } = await supabase.from('schools').select('id').eq('name', schoolName).single();
  if (schoolError) console.error('Error fetching school ID:', schoolError);
  if (schoolData) schoolId = schoolData.id;

  return { sportId, categoryId, schoolId };
};

/**
 * Finds a team's ID by its name and school name.
 * Assumes team names are unique within a school.
 * @param teamName The name of the team.
 * @param schoolName The name of the school the team belongs to.
 * @returns The team's ID or null if not found.
 */
export const findTeamIdByName = async (teamName: string, schoolName: string): Promise<string | null> => {
  const { data: schoolData, error: schoolError } = await supabase.from('schools').select('id').eq('name', schoolName).single();
  if (schoolError || !schoolData) {
    console.warn(`School '${schoolName}' not found for team '${teamName}'.`, schoolError);
    return null;
  }
  
  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('name', teamName)
    .eq('school_id', schoolData.id)
    .single();

  if (teamError) {
    if (teamError.code === 'PGRST116') { // No rows found
      console.warn(`Team '${teamName}' in school '${schoolName}' not found.`);
    } else {
      console.error(`Error finding team '${teamName}' in school '${schoolName}':`, teamError);
    }
    return null;
  }
  return teamData?.id || null;
};