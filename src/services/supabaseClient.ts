import { createClient } from '@supabase/supabase-js';
import { Match, Team, Player, Event, SchoolData, SportData, CategoryData, Gender, Sport, Category } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchAllData() {
  // Fetch Schools
  const { data: schoolsData, error: schoolsError } = await supabase
    .from('schools')
    .select('*');
  if (schoolsError) console.error('Error fetching schools:', schoolsError);
  const schools: SchoolData[] = schoolsData || [];

  // Fetch Sports
  const { data: sportsData, error: sportsError } = await supabase
    .from('sports')
    .select('*');
  if (sportsError) console.error('Error fetching sports:', sportsError);
  const sports: SportData[] = sportsData || [];

  // Fetch Categories
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('categories')
    .select('*');
  if (categoriesError) console.error('Error fetching categories:', categoriesError);
  const categories: CategoryData[] = categoriesData || [];

  // Fetch Genders (assuming a predefined list or a 'genders' table if dynamic)
  // For now, we'll use a static list as defined in types.ts
  const genders: Gender[] = [Gender.MASCULINO, Gender.FEMENINO];

  // Fetch Teams with nested school, sport, category
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select(`
      *,
      school:schools(id, name),
      sport:sports(id, name),
      category:categories(id, name)
    `);
  if (teamsError) console.error('Error fetching teams:', teamsError);
  const teams: Team[] = teamsData?.map(team => ({
    ...team,
    school: team.school as SchoolData,
    sport: team.sport as SportData,
    category: team.category as CategoryData,
  })) || [];

  // Fetch Players with nested team
  const { data: playersData, error: playersError } = await supabase
    .from('players')
    .select(`
      *,
      team:teams(id, name, school:schools(id, name), sport:sports(id, name), category:categories(id, name), gender)
    `);
  if (playersError) console.error('Error fetching players:', playersError);
  const players: Player[] = playersData?.map(player => ({
    ...player,
    team: {
      ...player.team,
      school: player.team.school as SchoolData,
      sport: player.team.sport as SportData,
      category: player.team.category as CategoryData,
    } as Team,
  })) || [];

  // Fetch Matches
  const { data: matchesData, error: matchesError } = await supabase
    .from('matches')
    .select('*');
  if (matchesError) console.error('Error fetching matches:', matchesError);
  const matches: Match[] = matchesData || [];

  // Fetch Events
  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('*');
  if (eventsError) console.error('Error fetching events:', eventsError);
  const events: Event[] = eventsData || [];

  return { teams, players, matches, events, schools, sports, categories, genders };
}

export async function fetchSportCategoryGenderSchoolIDs() {
  const { data: sports, error: sportsError } = await supabase.from('sports').select('id, name');
  if (sportsError) console.error('Error fetching sports for IDs:', sportsError);

  const { data: categories, error: categoriesError } = await supabase.from('categories').select('id, name, sport_id');
  if (categoriesError) console.error('Error fetching categories for IDs:', categoriesError);

  const { data: schools, error: schoolsError } = await supabase.from('schools').select('id, name');
  if (schoolsError) console.error('Error fetching schools for IDs:', schoolsError);

  return {
    sports: sports || [],
    categories: categories || [],
    schools: schools || [],
  };
}

// Helper to upsert schools
export async function upsertSchool(name: string): Promise<SchoolData | null> {
  const { data, error } = await supabase
    .from('schools')
    .upsert({ name }, { onConflict: 'name' })
    .select('*')
    .single();
  if (error) {
    console.error('Error upserting school:', error);
    return null;
  }
  return data;
}

// Helper to upsert sports
export async function upsertSport(name: Sport): Promise<SportData | null> {
  const { data, error } = await supabase
    .from('sports')
    .upsert({ name }, { onConflict: 'name' })
    .select('*')
    .single();
  if (error) {
    console.error('Error upserting sport:', error);
    return null;
  }
  return data;
}

// Helper to upsert categories
export async function upsertCategory(name: Category, sport_id: string): Promise<CategoryData | null> {
  const { data, error } = await supabase
    .from('categories')
    .upsert({ name, sport_id }, { onConflict: 'name, sport_id' })
    .select('*')
    .single();
  if (error) {
    console.error('Error upserting category:', error);
    return null;
  }
  return data;
}

// Helper to upsert teams
export async function upsertTeam(teamData: Omit<Team, 'id' | 'school' | 'sport' | 'category'>): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .upsert(teamData, { onConflict: 'name, school_id, sport_id, category_id, gender' })
    .select(`
      *,
      school:schools(id, name),
      sport:sports(id, name),
      category:categories(id, name)
    `)
    .single();
  if (error) {
    console.error('Error upserting team:', error);
    return null;
  }
  return {
    ...data,
    school: data.school as SchoolData,
    sport: data.sport as SportData,
    category: data.category as CategoryData,
  };
}

// Helper to insert matches
export async function insertMatch(matchData: Omit<Match, 'id'>): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .insert(matchData)
    .select('*')
    .single();
  if (error) {
    console.error('Error inserting match:', error);
    return null;
  }
  return data;
}
