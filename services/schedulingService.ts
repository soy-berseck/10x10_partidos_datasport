import { Court, Sport, SchedulingRule, TimeSlot, Match, Team, Category, Gender, MatchStatus, SchoolData, SportData, CategoryData } from '../types';
import { supabase } from './supabaseClient';

// --- Court Data Parsing ---

// Helper to map string to Sport enum
const mapStringToSport = (sportString: string): Sport | undefined => {
  const normalizedString = sportString.trim().toLowerCase();
  switch (normalizedString) {
    case 'fútbol': return Sport.FUTBOL;
    case 'baloncesto': return Sport.BALONCESTO;
    case 'voleibol': return Sport.VOLEIBOL;
    case 'natación': return Sport.NATACION;
    case 'tenis': return Sport.TENIS;
    case 'pádel': return Sport.PADEL;
    case 'softbol': return Sport.SOFTBOL;
    case 'ajedrez': return Sport.AJEDREZ;
    case 'gimnasia': return Sport.GIMNASIA;
    case 'golf': return Sport.GOLF;
    case 'equitación': return Sport.EQUITACION;
    default: return undefined;
  }
};

export const parseCourtData = (rawCourtData: string): Court[] => {
  const courts: Court[] = [];
  const lines = rawCourtData.split('\n').filter(line => line.trim() !== '');

  lines.forEach(line => {
    const parts = line.split('\t').map(p => p.trim());
    if (parts.length >= 4) {
      const id = parts[0]; // Assuming the first part is a simple ID for now
      const name = parts[1];
      const location = parts[3];
      const sportsStrings = parts[2].split(',').map(s => s.trim());
      const sports = sportsStrings.map(mapStringToSport).filter((s): s is Sport => s !== undefined);

      if (name && location && sports.length > 0) {
        courts.push({
          id,
          name,
          location,
          sports,
        });
      }
    }
  });
  return courts;
};

// --- Scheduling Rules Parsing ---

export const parseSchedulingRules = (rawRulesData: string, courts: Court[]): SchedulingRule[] => {
  const rules: SchedulingRule[] = [];
  const lines = rawRulesData.split('\n');
  let currentSport: Sport | undefined;
  let currentCategory: Category | undefined;
  let currentGender: Gender | undefined;
  let tempRule: Partial<SchedulingRule> = {};

  const resetTempRule = () => {
    tempRule = { matchDurationMinutes: 60, restBetweenMatchesMinutes: 60 }; // Default values
  };

  resetTempRule();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines or lines that are just headers like 'CANT.'
    if (!line || line.startsWith('CANT.')) continue;

    // Detect Sport, Category, Gender headers (e.g., 'FÚTBOL MASCULINO 2007-09')
    const sportCategoryGenderMatch = line.match(/(FÚTBOL|BALONCESTO|VOLEIBOL|FÚTBOL 7)\s+(MASCULINO|FEMENINO|MIXTO)?\s*(\d{4}-\d{2})?/i);
    if (sportCategoryGenderMatch) {
      if (currentSport && currentCategory && currentGender && Object.keys(tempRule).length > 2) {
        // If we have a complete rule from previous block, save it
        rules.push({ ...tempRule, sport: currentSport, category: currentCategory, gender: currentGender } as SchedulingRule);
      }
      resetTempRule();
      currentSport = mapStringToSport(sportCategoryGenderMatch[1]);
      currentGender = sportCategoryGenderMatch[2] ? (sportCategoryGenderMatch[2].toUpperCase() as Gender) : undefined;
      currentCategory = sportCategoryGenderMatch[3] || 'General'; // Use age group as category
      continue;
    }

    if (!currentSport || !currentCategory || !currentGender) continue; // Must have context

    // Parse specific rules and conditions
    if (line.startsWith('A)')) {
      const groupMatch = line.match(/(\d+)\s+grupos de (\d+)\s+colegios y se jugarán (\d+)\s+partidos del mismo grupo(?: y (\d+)\s+partidos intergrupos)?/i);
      if (groupMatch) {
        tempRule.groupCount = parseInt(groupMatch[1]);
        tempRule.teamsPerGroup = parseInt(groupMatch[2]);
        tempRule.matchesPerTeamInGroup = parseInt(groupMatch[3]);
        if (groupMatch[4]) {
          tempRule.interGroupMatchesPerTeam = parseInt(groupMatch[4]);
        }
      }
      const singleGroupMatch = line.match(/1\s+grupo de (\d+)\s+colegios y se jugarán (\d+)\s+partidos fase de grupo(?:, luego (semis y final|final|semis y final|por posición del torneo))?/i);
      if (singleGroupMatch) {
        tempRule.groupCount = 1;
        tempRule.teamsPerGroup = parseInt(singleGroupMatch[1]);
        tempRule.matchesPerTeamInGroup = parseInt(singleGroupMatch[2]);
        if (singleGroupMatch[3]) {
          if (singleGroupMatch[3].includes('semis y final')) tempRule.playoffStructure = 'semis_final';
          else if (singleGroupMatch[3].includes('final')) tempRule.playoffStructure = 'final_only';
          else if (singleGroupMatch[3].includes('por posición del torneo')) tempRule.playoffStructure = 'position_playoffs';
        }
      }
    } else if (line.startsWith('B)')) {
      const courtsMatch = line.match(/Jugar(?:á|án) en las canchas de: (.+)/i);
      if (courtsMatch) {
        const courtNames = courtsMatch[1].split(/, y | y |,/).map(s => s.trim());
        tempRule.specificCourts = courtNames.map(courtName => {
          // Attempt to find full court object or just use name
          const foundCourt = courts.find(c => courtName.includes(c.name));
          if (foundCourt) {
            // Check for sub-court names like 'Monómeros 1'
            const subCourtMatch = courtName.match(/(.+)\s+(\d+)/);
            if (subCourtMatch && foundCourt.name.includes(subCourtMatch[1].trim())) {
              return { courtId: foundCourt.id, subCourtName: subCourtMatch[2] };
            }
            return { courtId: foundCourt.id };
          }
          return { courtId: courtName }; // Fallback to just name if not found
        });
      }
    } else if (line.startsWith('C) El torneo debe finalizar el viernes 13 marzo máximo 4:00pm')) {
      // Specific note, can be added to notes or handled in scheduling logic
      tempRule.notes = (tempRule.notes ? tempRule.notes + '; ' : '') + line;
    } else if (line.startsWith('BALONCESTO. Se jugarán')) {
      const basketballRulesMatch = line.match(/Se programan partidos cada hora y (\d+) minutos./);
      if (basketballRulesMatch) {
        tempRule.matchDurationMinutes = 4 * 10 + 3 * 7; // 4 tiempos de 10 min, 3 descansos de 7 min
        tempRule.restBetweenMatchesMinutes = 60; // At least one hour rest
      }
    } else if (line.startsWith('VOLEIBOL. Se jugarán')) {
      const volleyballRulesMatch = line.match(/Se programan partidos cada hora y (\d+) minutos./);
      if (volleyballRulesMatch) {
        tempRule.matchDurationMinutes = 75; // 1h 15min
        tempRule.maxConsecutiveMatches = 2;
      }
    }
    // Add more parsing for time slots (D), (E) etc. if needed, for now focusing on structure
  }

  // Add the last collected rule
  if (currentSport && currentCategory && currentGender && Object.keys(tempRule).length > 2) {
    rules.push({ ...tempRule, sport: currentSport, category: currentCategory, gender: currentGender } as SchedulingRule);
  }

  return rules;
};

// --- Scheduling Logic (to be implemented) ---

// Placeholder for the main scheduling function
export const generateTournamentSchedule = async (
  teams: Team[],
  allSports: SportData[],
  allCategories: CategoryData[],
  allSchools: SchoolData[],
  courts: Court[],
  rules: SchedulingRule[],
): Promise<Match[]> => {
  console.log('Generating schedule with:', { teams, allSports, allCategories, allSchools, courts, rules });
  const generatedMatches: Match[] = [];
  const teamMatchCounts: { [teamId: string]: number } = {};
  const teamLastMatchTime: { [teamId: string]: Date } = {};

  // Helper to get SportData, CategoryData, SchoolData by name
  const getSportData = (name: Sport) => allSports.find(s => s.name === name);
  const getCategoryData = (name: Category) => allCategories.find(c => c.name === name);
  const getSchoolData = (id: string) => allSchools.find(s => s.id === id);

  // Group teams by sport, category, and gender
  const groupedTeams: { [key: string]: Team[] } = {};
  teams.forEach(team => {
    const key = `${team.sport.name}-${team.category.name}-${team.gender}`;
    if (!groupedTeams[key]) {
      groupedTeams[key] = [];
    }
    groupedTeams[key].push(team);
  });

  // Sort rules to handle specific sports/categories first if needed, or by priority
  rules.sort((a, b) => a.sport.localeCompare(b.sport) || a.category.localeCompare(b.category) || a.gender.localeCompare(b.gender));

  for (const rule of rules) {
    const groupKey = `${rule.sport}-${rule.category}-${rule.gender}`;
    const teamsInGroup = groupedTeams[groupKey];

    if (!teamsInGroup || teamsInGroup.length < 2) {
      console.warn(`Skipping rule for ${groupKey}: Not enough teams (${teamsInGroup?.length || 0}) to schedule matches.`);
      continue;
    }

    console.log(`Applying rule for ${groupKey} with ${teamsInGroup.length} teams.`);

    // Filter courts specific to this rule and sport
    const availableCourts = courts.filter(court =>
      court.sports.includes(rule.sport) &&
      (!rule.specificCourts || rule.specificCourts.some(rc => rc.courtId === court.id))
    );

    if (availableCourts.length === 0) {
      console.warn(`No available courts for rule ${groupKey}. Skipping.`);
      continue;
    }

    let courtIndex = 0;
    let matchCounter = 0;

    // Generate Round-Robin matches within the group
    for (let i = 0; i < teamsInGroup.length; i++) {
      for (let j = i + 1; j < teamsInGroup.length; j++) {
        if (matchCounter >= rule.matchesPerTeamInGroup * teamsInGroup.length / 2) break; // Simple way to limit matches per team

        const team1 = teamsInGroup[i];
        const team2 = teamsInGroup[j];

        // Skip if teams are from the same school (optional, based on specific tournament rules)
        if (team1.school.id === team2.school.id) {
          console.log(`Skipping match between teams from same school: ${team1.name} vs ${team2.name}`);
          continue;
        }

        // Basic time slot and court assignment (sequential for now)
        const assignedCourt = availableCourts[courtIndex % availableCourts.length];
        const subCourtName = rule.specificCourts?.find(rc => rc.courtId === assignedCourt.id)?.subCourtName;

        // For simplicity, let's just assign a date in the near future and a generic time
        // In a real scenario, this would involve complex time slot management
        const matchDate = new Date();
        matchDate.setDate(matchDate.getDate() + Math.floor(generatedMatches.length / 5) + 1); // Distribute over days
        matchDate.setHours(10 + (matchCounter % 8), (matchCounter * 15) % 60, 0, 0); // Distribute over hours

        // Ensure rest period (very basic implementation)
        const team1LastMatch = teamLastMatchTime[team1.id];
        const team2LastMatch = teamLastMatchTime[team2.id];

        if (team1LastMatch && (matchDate.getTime() - team1LastMatch.getTime()) / (1000 * 60) < rule.restBetweenMatchesMinutes) {
          console.log(`Team ${team1.name} needs more rest. Skipping match for now.`);
          continue; // Skip for now, a more advanced scheduler would find another slot
        }
        if (team2LastMatch && (matchDate.getTime() - team2LastMatch.getTime()) / (1000 * 60) < rule.restBetweenMatchesMinutes) {
          console.log(`Team ${team2.name} needs more rest. Skipping match for now.`);
          continue; // Skip for now
        }

        const newMatch: Match = {
          id: `match-${generatedMatches.length + 1}`,
          sport: rule.sport,
          category: rule.category,
          gender: rule.gender,
          team1_id: team1.id,
          team2_id: team2.id,
          team1: team1, // Full team objects for client-side display
          team2: team2,
          match_date: matchDate.toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
          location: subCourtName ? `${assignedCourt.name} (${subCourtName})` : assignedCourt.name,
          status: MatchStatus.PROGRAMADO,
          team1_score: 0,
          team2_score: 0,
          live_timer_seconds: 0,
          start_time_timestamp: null,
        };

        generatedMatches.push(newMatch);
        teamMatchCounts[team1.id] = (teamMatchCounts[team1.id] || 0) + 1;
        teamMatchCounts[team2.id] = (teamMatchCounts[team2.id] || 0) + 1;
        teamLastMatchTime[team1.id] = matchDate;
        teamLastMatchTime[team2.id] = matchDate;

        courtIndex++;
        matchCounter++;
      }
    }
  }

  console.log('Generated matches:', generatedMatches);
  return generatedMatches;
};

// --- Supabase Integration ---

export const saveMatchesToSupabase = async (matches: Match[]): Promise<boolean> => {
  if (matches.length === 0) {
    console.log('No matches to save.');
    return true;
  }

  const { data, error } = await supabase
    .from('matches')
    .insert(matches.map(match => ({
      sport: match.sport,
      category: match.category,
      gender: match.gender,
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      match_date: match.match_date,
      location: match.location,
      status: MatchStatus.PROGRAMADO, // Always save as scheduled initially
      team1_score: 0,
      team2_score: 0,
      // Do not include id, team1, team2, live_timer_seconds, start_time_timestamp as they are either generated by Supabase or not relevant for initial insert
    })));

  if (error) {
    console.error('Error saving matches to Supabase:', error);
    return false;
  }

  console.log(`Successfully saved ${data?.length || 0} matches to Supabase.`);
  return true;
};
