import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Match, Team, Player, Event, MatchStatus, SchoolData, SportData, CategoryData, Gender, TournamentSchedule, Sport, Category, Page } from './types';
import { supabase, fetchAllData, upsertSchool, upsertSport, upsertCategory, upsertTeam, insertMatch } from './services/supabaseClient';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import LiveScoring from './pages/LiveScoring';
import Results from './pages/Results';
import Statistics from './pages/Statistics';
import Standings from './pages/Standings';
import TeamsPage from './pages/TeamsPage';
import SchoolsPage from './pages/SchoolsPage';
import PlayersPage from './pages/PlayersPage';
import RegisterTeamsPlayers from './pages/RegisterTeamsPlayers';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { extractTournamentSchedule } from './services/llmService';
import { SPORT_EVENT_TYPES_MAP, PRIMARY_SCORING_EVENT_TYPES_MAP, SPORT_SCORE_TERM_MAP } from './utils/sportConfig';
import { parseDateTime, generateMatchTimeSlots, getMatchEndTime, DEFAULT_MATCH_DURATION_MINUTES, DEFAULT_BREAK_MINUTES, DEFAULT_MATCH_STATUS } from './utils/dateUtils';


interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
  matchId?: string;
}

const AppContent: React.FC = () => {
  const { currentUser, loading: authLoading } = React.useContext(AuthContext);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [allSchools, setAllSchools] = useState<SchoolData[]>([]);
  const [allSports, setAllSports] = useState<SportData[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryData[]>([]);
  const [gendersList, setGendersList] = useState<Gender[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [navigateOptions, setNavigateOptions] = useState<NavigateOptions | undefined>(undefined);
  const [isProcessingLLM, setIsProcessingLLM] = useState(false); // New state for LLM processing

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { teams, players, matches, events, schools, sports, categories, genders } = await fetchAllData();
    setTeams(teams);
    setPlayers(players);
    setMatches(matches);
    setEvents(events);
    setAllSchools(schools);
    setAllSports(sports);
    setAllCategories(categories);
    setGendersList(genders);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    const teamsChannel = supabase.channel('teams_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchData())
      .subscribe();

    const playersChannel = supabase.channel('players_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchData())
      .subscribe();

    const matchesChannel = supabase.channel('matches_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchData())
      .subscribe();

    const eventsChannel = supabase.channel('events_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [fetchData]);

  const handleAddMatch = useCallback((newMatch: Match) => {
    // This will trigger a re-fetch via the Supabase real-time subscription
      // setMatches(prev => [...prev, newMatch]);
  }, []);

  const processAndSaveTournamentSchedule = useCallback(async (schedule: TournamentSchedule) => {
    console.log("Processing and saving tournament schedule:", schedule);

    const existingSchoolsMap = new Map<string, SchoolData>(allSchools.map(s => [s.name.toLowerCase(), s]));
    const existingSportsMap = new Map<string, SportData>(allSports.map(s => [s.name.toLowerCase(), s]));
    const existingCategoriesMap = new Map<string, CategoryData>(allCategories.map(c => [`${c.name.toLowerCase()}-${c.sport_id}`, c]));

    const processedSchools = new Map<string, SchoolData>();
    const processedSports = new Map<string, SportData>();
    const processedCategories = new Map<string, CategoryData>();

    for (const group of schedule.tournamentGroups) {
      // Upsert Sport
      const sportNameLower = group.sport.toLowerCase();
      let sport = processedSports.get(sportNameLower) || existingSportsMap.get(sportNameLower);
      if (!sport) {
        sport = await upsertSport(group.sport as Sport);
        if (sport) processedSports.set(sportNameLower, sport);
      }
      if (!sport) {
        console.error(`Failed to upsert sport: ${group.sport}`);
        continue;
      }
      console.log(`Upserted sport: ${sport.name} (ID: ${sport.id})`);

      // Upsert Category
      const categoryNameLower = group.category.toLowerCase();
      const categoryKey = `${categoryNameLower}-${sport.id}`;
      let category = processedCategories.get(categoryKey) || existingCategoriesMap.get(categoryKey);
      if (!category) {
        category = await upsertCategory(group.category as Category, sport.id);
        if (category) processedCategories.set(categoryKey, category);
      }
      if (!category) {
        console.error(`Failed to upsert category: ${group.category} for sport ${group.sport}`);
        continue;
      }
      console.log(`Upserted category: ${category.name} (ID: ${category.id}) for sport ${sport.name}`);

      // Upsert Schools for teams in the group
      for (const team of group.teams) {
        const schoolNameLower = team.schoolName.toLowerCase();
        let school = processedSchools.get(schoolNameLower) || existingSchoolsMap.get(schoolNameLower);
        if (!school) {
          school = await upsertSchool(team.schoolName);
          if (school) processedSchools.set(schoolNameLower, school);
        }
        if (!school) {
          console.error(`Failed to upsert school: ${team.schoolName}`);
          continue;
        }
        console.log(`Upserted school: ${school.name} (ID: ${school.id})`);
      }
    }

    console.log("Existing schools map:", existingSchoolsMap);
    console.log("Existing sports map:", existingSportsMap);
    console.log("Existing categories map:", existingCategoriesMap);
    console.log("Processed schools after initial upserts:", processedSchools);
    console.log("Processed sports after initial upserts:", processedSports);
    console.log("Processed categories after initial upserts:", processedCategories);

    const processedTeams = new Map<string, Team>();
    console.log("Processed schools after initial upserts:", processedSchools);
    console.log("Processed sports after initial upserts:", processedSports);
    console.log("Processed categories after initial upserts:", processedCategories);
    const existingTeamsMap = new Map<string, Team>(teams.map(t => [
      `${t.name.toLowerCase()}-${t.school_id}-${t.sport_id}-${t.category_id}-${t.gender.toLowerCase()}`,
      t
    ]));

    for (const group of schedule.tournamentGroups) {
      const sport = processedSports.get(group.sport.toLowerCase()) || existingSportsMap.get(group.sport.toLowerCase());
      const category = processedCategories.get(`${group.category.toLowerCase()}-${sport?.id}`) || existingCategoriesMap.get(`${group.category.toLowerCase()}-${sport?.id}`);

      if (!sport || !category) {
        console.error(`Skipping group due to missing sport or category: ${group.sport}, ${group.category}`);
        continue;
      }

      for (const teamData of group.teams) {
        const school = processedSchools.get(teamData.schoolName.toLowerCase()) || existingSchoolsMap.get(teamData.schoolName.toLowerCase());

        if (!school) {
          console.error(`Skipping team due to missing school: ${teamData.schoolName} (${teamData.teamName})`);
          continue;
        }

        const teamKey = `${teamData.teamName.toLowerCase()}-${school.id}-${sport.id}-${category.id}-${teamData.gender.toLowerCase()}`;
        let team = processedTeams.get(teamKey) || existingTeamsMap.get(teamKey);

        if (!team) {
          team = await upsertTeam({
            name: teamData.teamName,
            school_id: school.id,
            sport_id: sport.id,
            category_id: category.id,
            gender: teamData.gender,
            // Add other team properties if necessary, e.g., logo_url, coach_name
          });
          if (team) processedTeams.set(teamKey, team);
        }
        if (!team) {
          console.error(`Failed to upsert team: ${teamData.teamName}`);
          continue;
        }
        console.log(`Upserted team: ${team.name} (ID: ${team.id}) for school ${school.name}, sport ${sport.name}, category ${category.name}`);
      }
    }

    const parseRules = (ruleString: string) => {
      const rules: any = {};
      const groupMatch = ruleString.match(/(\d+)\s*grupos de\s*(\d+)\s*colegios/i);
      if (groupMatch) {
        rules.numberOfGroups = parseInt(groupMatch[1], 10);
        rules.teamsPerGroup = parseInt(groupMatch[2], 10);
      }

      const matchesPerGroupMatch = ruleString.match(/(\d+)\s*partidos del mismo grupo/i);
      if (matchesPerGroupMatch) {
        rules.matchesPerGroup = parseInt(matchesPerGroupMatch[1], 10);
      }

      const interGroupMatchesMatch = ruleString.match(/(\d+)\s*partidos intergrupos/i);
      if (interGroupMatchesMatch) {
        rules.interGroupMatches = parseInt(interGroupMatchesMatch[1], 10);
      }

      const knockoutMatch = ruleString.match(/(semis y final|luego semis y final|1ero y 2do juegan por la final y 3ero vs 4to por la medalla de bronce|1ero del grupo avanza a final y espera rival entre 2do vs 3ero|2do y 3ero juegan por la medalla de bronce)/i);
      if (knockoutMatch) {
        rules.knockoutPhase = knockoutMatch[0];
      }

      const matchDurationMatch = ruleString.match(/(\d+)\s*tiempos de\s*(\d+)\s*minutos/i);
      if (matchDurationMatch) {
        rules.matchDurationMinutes = parseInt(matchDurationMatch[1], 10) * parseInt(matchDurationMatch[2], 10);
        const breakMatch = ruleString.match(/con\s*(\d+)\s*de descanso/i);
        if (breakMatch) {
          rules.breakMinutes = parseInt(breakMatch[1], 10);
        }
      }

      const matchIntervalMatch = ruleString.match(/programan partidos cada hora y\s*(\d+)\s*minutos/i);
      if (matchIntervalMatch) {
        rules.matchIntervalMinutes = 60 + parseInt(matchIntervalMatch[1], 10);
      }

      const restBetweenMatchesMatch = ruleString.match(/equipo juegue su 2do partido del día debe tener al menos una hora de descanso/i);
      if (restBetweenMatchesMatch) {
        rules.restBetweenMatches = 60; // 60 minutes
      }
      return rules;
    };

    console.log("Processed teams after all team upserts:", processedTeams);

    const allMatchesToInsert: Omit<Match, 'id'>[] = [];
    const teamDailyMatchCount = new Map<string, Map<string, number>>(); // teamId -> date -> count
    const teamLastMatchTime = new Map<string, Map<string, Date>>(); // teamId -> date -> lastMatchEndTime

    for (const group of schedule.tournamentGroups) {
      const sport = processedSports.get(group.sport.toLowerCase()) || existingSportsMap.get(group.sport.toLowerCase());
      const category = processedCategories.get(`${group.category.toLowerCase()}-${sport?.id}`) || existingCategoriesMap.get(`${group.category.toLowerCase()}-${sport?.id}`);

      if (!sport || !category) {
        console.error(`Skipping match generation for group due to missing sport or category: ${group.sport}, ${group.category}`);
        continue;
      }

      const groupTeams = group.teams.map(teamData => {
        const school = processedSchools.get(teamData.schoolName.toLowerCase()) || existingSchoolsMap.get(teamData.schoolName.toLowerCase());
        const teamKey = `${teamData.teamName.toLowerCase()}-${school?.id}-${sport.id}-${category.id}-${teamData.gender.toLowerCase()}`;
        return processedTeams.get(teamKey) || existingTeamsMap.get(teamKey);
      }).filter((t): t is Team => t !== undefined);

      if (groupTeams.length < 2) {
        console.warn(`Not enough teams (${groupTeams.length}) to generate matches for group: ${group.sport} ${group.category} ${group.gender}`);
        continue;
      }
      console.log(`Group teams for ${group.sport} ${group.category}:`, groupTeams.map(t => t.name));

      // Parse schedule dates and times
      const availableDates: { date: string; startTime: string; endTime: string; location: string; }[] = [];
      for (const sched of group.schedule) {
        const dateMatch = sched.match(/(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s+\d{1,2}\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
        const timeMatch = sched.match(/\d{1,2}:\d{2}\s*a\s*\d{1,2}:\d{2}\s*(am|pm)?/i);
        const locationMatch = sched.match(/cancha de:\s*([\w\s\d]+)/i);

        if (dateMatch && timeMatch && locationMatch) {
          availableDates.push({
            date: dateMatch[0],
            startTime: timeMatch[0].split(' ')[0],
            endTime: timeMatch[0].split(' ')[2] + (timeMatch[0].split(' ')[3] || ''),
            location: locationMatch[1].trim(),
          });
        } else {
          console.warn(`Could not fully parse schedule entry: ${sched}`);
        }
      }
      console.log(`Available dates for group ${group.sport} ${group.category}:`, availableDates);
      }

      if (availableDates.length === 0) {
        console.warn(`No valid schedule dates found for group: ${group.sport} ${group.category} ${group.gender}`);
        continue;
      }

      // Simple Round Robin for now
      console.log("Processed teams after all team upserts:", processedTeams);

      const groupRules = parseRules(group.rules);
      console.log(`Parsed rules for group ${group.sport} ${group.category}:`, groupRules);
      const matchDuration = groupRules.matchDurationMinutes || DEFAULT_MATCH_DURATION_MINUTES;
      const breakDuration = groupRules.breakMinutes || DEFAULT_BREAK_MINUTES;
      const matchInterval = groupRules.matchIntervalMinutes || (matchDuration + breakDuration);
      const restBetweenMatches = groupRules.restBetweenMatches || 0;

      const generatedMatches: Omit<Match, 'id'>[] = [];
      const occupiedSlots = new Set<string>();

      // Sort available dates to schedule chronologically
      const sortedAvailableDates = availableDates.sort((a, b) => {
        const dateA = parseDateTime(a.date, a.startTime);
        const dateB = parseDateTime(b.date, b.startTime);
        if (!dateA || !dateB) return 0;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });

      let teamsInSubGroups: Team[][] = [groupTeams]; // Default to one group

      if (groupRules.numberOfGroups && groupRules.numberOfGroups > 1) {
        // Simple distribution into sub-groups
        teamsInSubGroups = Array.from({ length: groupRules.numberOfGroups }, () => []);
        groupTeams.forEach((team, index) => {
          teamsInSubGroups[index % groupRules.numberOfGroups].push(team);
        });
      }

      // --- Group Stage Matches ---
      for (const subGroup of teamsInSubGroups) {
        const matchesToSchedule: Array<[Team, Team]> = [];
        for (let i = 0; i < subGroup.length; i++) {
          for (let j = i + 1; j < subGroup.length; j++) {
            // Only schedule matches if rules.matchesPerGroup allows (simple round robin for now)
            matchesToSchedule.push([subGroup[i], subGroup[j]]);
          }
        }

        for (const [team1, team2] of matchesToSchedule) {
          let matchScheduled = false;
          for (const dateInfo of sortedAvailableDates) {
            const slots = generateMatchTimeSlots(
              dateInfo.date,
              dateInfo.date,
              dateInfo.startTime,
              dateInfo.endTime,
              matchDuration,
              breakDuration
            );

            for (const slot of slots) {
              const proposedStartTime = new Date(slot);
              const proposedEndTime = new Date(getMatchEndTime(slot, matchDuration));
              const matchDateKey = proposedStartTime.toISOString().split('T')[0];

              // Check for team 1 rest time
              const team1LastMatch = teamLastMatchTime.get(team1.id)?.get(matchDateKey);
              if (team1LastMatch && (proposedStartTime.getTime() - team1LastMatch.getTime()) < restBetweenMatches * 60 * 1000) {
                continue; // Not enough rest for team 1
              }

              // Check for team 2 rest time
              const team2LastMatch = teamLastMatchTime.get(team2.id)?.get(matchDateKey);
              if (team2LastMatch && (proposedStartTime.getTime() - team2LastMatch.getTime()) < restBetweenMatches * 60 * 1000) {
                continue; // Not enough rest for team 2
              }

              // Check if slot is occupied by another match
              if (occupiedSlots.has(slot)) {
                console.log(`Slot ${slot} already occupied. Skipping match between ${team1.name} and ${team2.name}.`);
                continue;
              }

              // If all checks pass, schedule the match
              generatedMatches.push({
                team1_id: team1.id,
                team2_id: team2.id,
                sport_id: sport.id,
                category_id: category.id,
                match_date: proposedStartTime.toISOString(),
                match_time: proposedStartTime.toISOString(),
                location: dateInfo.location,
                status: DEFAULT_MATCH_STATUS,
                score_team1: 0,
                score_team2: 0,
              });
              console.log(`Scheduled match: ${team1.name} vs ${team2.name} at ${proposedStartTime.toISOString()} in ${dateInfo.location}`);

              occupiedSlots.add(slot);

              // Update last match time for both teams
              if (!teamLastMatchTime.has(team1.id)) teamLastMatchTime.set(team1.id, new Map());
              teamLastMatchTime.get(team1.id)?.set(matchDateKey, proposedEndTime);
              if (!teamLastMatchTime.has(team2.id)) teamLastMatchTime.set(team2.id, new Map());
              teamLastMatchTime.get(team2.id)?.set(matchDateKey, proposedEndTime);

              // Update daily match count for both teams
              if (!teamDailyMatchCount.has(team1.id)) teamDailyMatchCount.set(team1.id, new Map());
              teamDailyMatchCount.get(team1.id)?.set(matchDateKey, (teamDailyMatchCount.get(team1.id)?.get(matchDateKey) || 0) + 1);
              if (!teamDailyMatchCount.has(team2.id)) teamDailyMatchCount.set(team2.id, new Map());
              teamDailyMatchCount.get(team2.id)?.set(matchDateKey, (teamDailyMatchCount.get(team2.id)?.get(matchDateKey) || 0) + 1);

              matchScheduled = true;
              break; // Move to the next matchToSchedule
            }
            if (matchScheduled) break; // Move to the next matchToSchedule
          }
          if (!matchScheduled) {
            console.warn(`Could not find an available slot for match between ${team1.name} and ${team2.name} in group ${group.sport} ${group.category}`);
          }
        }
      }

      // --- Inter-group Matches ---
      if (groupRules.interGroupMatches && teamsInSubGroups.length > 1) {
        console.log(`Scheduling ${groupRules.interGroupMatches} inter-group matches for ${group.sport} ${group.category}`);
        const interGroupMatchesToSchedule: Array<[Team, Team]> = [];
        for (let i = 0; i < teamsInSubGroups.length; i++) {
          for (let j = i + 1; j < teamsInSubGroups.length; j++) {
            // For simplicity, pick one team from each group to play inter-group
            // This can be made more sophisticated later
            if (teamsInSubGroups[i].length > 0 && teamsInSubGroups[j].length > 0) {
              interGroupMatchesToSchedule.push([teamsInSubGroups[i][0], teamsInSubGroups[j][0]]);
            }
          }
        }

        for (const [team1, team2] of interGroupMatchesToSchedule) {
          let matchScheduled = false;
          for (const dateInfo of sortedAvailableDates) {
            const slots = generateMatchTimeSlots(
              dateInfo.date,
              dateInfo.date,
              dateInfo.startTime,
              dateInfo.endTime,
              matchDuration,
              breakDuration
            );

            for (const slot of slots) {
              const proposedStartTime = new Date(slot);
              const proposedEndTime = new Date(getMatchEndTime(slot, matchDuration));
              const matchDateKey = proposedStartTime.toISOString().split('T')[0];

              // Check for team 1 rest time
              const team1LastMatch = teamLastMatchTime.get(team1.id)?.get(matchDateKey);
              if (team1LastMatch && (proposedStartTime.getTime() - team1LastMatch.getTime()) < restBetweenMatches * 60 * 1000) {
                continue;
              }

              // Check for team 2 rest time
              const team2LastMatch = teamLastMatchTime.get(team2.id)?.get(matchDateKey);
              if (team2LastMatch && (proposedStartTime.getTime() - team2LastMatch.getTime()) < restBetweenMatches * 60 * 1000) {
                continue;
              }

              // Check if slot is occupied
              if (occupiedSlots.has(slot)) {
                console.log(`Slot ${slot} already occupied for inter-group match. Skipping match between ${team1.name} and ${team2.name}.`);
                continue;
              }

              generatedMatches.push({
                team1_id: team1.id,
                team2_id: team2.id,
                sport_id: sport.id,
                category_id: category.id,
                match_date: proposedStartTime.toISOString(),
                match_time: proposedStartTime.toISOString(),
                location: dateInfo.location,
                status: DEFAULT_MATCH_STATUS,
                score_team1: 0,
                score_team2: 0,
              });
              console.log(`Scheduled inter-group match: ${team1.name} vs ${team2.name} at ${proposedStartTime.toISOString()} in ${dateInfo.location}`);
              occupiedSlots.add(slot);

              if (!teamLastMatchTime.has(team1.id)) teamLastMatchTime.set(team1.id, new Map());
              teamLastMatchTime.get(team1.id)?.set(matchDateKey, proposedEndTime);
              if (!teamLastMatchTime.has(team2.id)) teamLastMatchTime.set(team2.id, new Map());
              teamLastMatchTime.get(team2.id)?.set(matchDateKey, proposedEndTime);

              if (!teamDailyMatchCount.has(team1.id)) teamDailyMatchCount.set(team1.id, new Map());
              teamDailyMatchCount.get(team1.id)?.set(matchDateKey, (teamDailyMatchCount.get(team1.id)?.get(matchDateKey) || 0) + 1);
              if (!teamDailyMatchCount.has(team2.id)) teamDailyMatchCount.set(team2.id, new Map());
              teamDailyMatchCount.get(team2.id)?.set(matchDateKey, (teamDailyMatchCount.get(team2.id)?.get(matchDateKey) || 0) + 1);

              matchScheduled = true;
              break;
            }
            if (matchScheduled) break;
          }
          if (!matchScheduled) {
            console.warn(`Could not find an available slot for inter-group match between ${team1.name} and ${team2.name}`);
          }
        }
      }

      // --- Knockout Phase ---
      if (groupRules.knockoutPhase) {
        console.log(`Scheduling knockout phase (${groupRules.knockoutPhase}) for ${group.sport} ${group.category}`);

        // Placeholder for Semi-finals and Finals
        // This assumes a simple 4-team knockout for now, actual teams would advance based on group stage results
        const potentialKnockoutTeams = groupTeams.slice(0, 4); // Take first 4 teams as potential advancers

        if (potentialKnockoutTeams.length >= 4) {
          console.log(`Scheduling semi-finals for ${group.sport} ${group.category}`);
          // Semi-final 1
          let sf1Scheduled = false;
          for (const dateInfo of sortedAvailableDates) {
            const slots = generateMatchTimeSlots(
              dateInfo.date,
              dateInfo.date,
              dateInfo.startTime,
              dateInfo.endTime,
              matchDuration,
              breakDuration
            );
            const nextSlot = slots.find(slot => !occupiedSlots.has(slot));
            if (nextSlot) {
              const startTime = nextSlot;
              const endTime = getMatchEndTime(startTime, matchDuration);
              generatedMatches.push({
                team1_id: potentialKnockoutTeams[0].id,
                team2_id: potentialKnockoutTeams[1].id,
                sport_id: sport.id,
                category_id: category.id,
                match_date: startTime,
                match_time: startTime,
                location: dateInfo.location,
                status: MatchStatus.SCHEDULED, // Use SCHEDULED for knockout matches
                score_team1: 0,
                score_team2: 0,
              });
              console.log(`Scheduled Semi-final 1: ${potentialKnockoutTeams[0].name} vs ${potentialKnockoutTeams[1].name} at ${startTime} in ${dateInfo.location}`);
              occupiedSlots.add(nextSlot);
              sf1Scheduled = true;
              break;
            }
          }
          if (!sf1Scheduled) console.warn(`Could not schedule Semi-final 1 for ${group.sport} ${group.category}`);

          // Semi-final 2
          let sf2Scheduled = false;
          for (const dateInfo of sortedAvailableDates) {
            const slots = generateMatchTimeSlots(
              dateInfo.date,
              dateInfo.date,
              dateInfo.startTime,
              dateInfo.endTime,
              matchDuration,
              breakDuration
            );
            const nextSlot = slots.find(slot => !occupiedSlots.has(slot));
            if (nextSlot) {
              const startTime = nextSlot;
              const endTime = getMatchEndTime(startTime, matchDuration);
              generatedMatches.push({
                team1_id: potentialKnockoutTeams[2].id,
                team2_id: potentialKnockoutTeams[3].id,
                sport_id: sport.id,
                category_id: category.id,
                match_date: startTime,
                match_time: startTime,
                location: dateInfo.location,
                status: MatchStatus.SCHEDULED,
                score_team1: 0,
                score_team2: 0,
              });
              console.log(`Scheduled Semi-final 2: ${potentialKnockoutTeams[2].name} vs ${potentialKnockoutTeams[3].name} at ${startTime} in ${dateInfo.location}`);
              occupiedSlots.add(nextSlot);
              sf2Scheduled = true;
              break;
            }
          }
          if (!sf2Scheduled) console.warn(`Could not schedule Semi-final 2 for ${group.sport} ${group.category}`);

          console.log(`Scheduling final for ${group.sport} ${group.category}`);
          // Final (placeholder teams)
          let finalScheduled = false;
          for (const dateInfo of sortedAvailableDates) {
            const slots = generateMatchTimeSlots(
              dateInfo.date,
              dateInfo.date,
              dateInfo.startTime,
              dateInfo.endTime,
              matchDuration,
              breakDuration
            );
            const nextSlot = slots.find(slot => !occupiedSlots.has(slot));
            if (nextSlot) {
              const startTime = nextSlot;
              const endTime = getMatchEndTime(startTime, matchDuration);
              generatedMatches.push({
                team1_id: potentialKnockoutTeams[0].id, // Placeholder
                team2_id: potentialKnockoutTeams[2].id, // Placeholder
                sport_id: sport.id,
                category_id: category.id,
                match_date: startTime,
                match_time: startTime,
                location: dateInfo.location,
                status: MatchStatus.SCHEDULED,
                score_team1: 0,
                score_team2: 0,
              });
              occupiedSlots.add(nextSlot);
              finalScheduled = true;
              break;
            }
          }
          if (!finalScheduled) console.warn(`Could not schedule Final for ${group.sport} ${group.category}`);

        } else {
          console.warn(`Not enough teams (${potentialKnockoutTeams.length}) for knockout phase in group: ${group.sport} ${group.category}`);
        }
      }

      allMatchesToInsert.push(...generatedMatches);
    }

    console.log("Generated Matches:", allMatchesToInsert);

    // Insert all generated matches into Supabase
    for (const match of allMatchesToInsert) {
      const { data, error } = await insertMatch(match);
      if (error) {
        console.error("Error inserting match:", match, error);
      } else {
        console.log("Successfully inserted match:", data);
      }
    }

    // After all data is processed and saved, re-fetch all data to update the UI
    await fetchData();
    console.log("Finished processing and saving tournament schedule. Data re-fetched.");

  }, [allSchools, allSports, allCategories, teams, fetchData]); // Dependencies for useCallback

  const handleNavigate = useCallback((page: Page, options?: NavigateOptions) => {
    setActivePage(page);
    setNavigateOptions(options);
  }, []);

  const handleExtractTournamentSchedule = async () => {
    setIsProcessingLLM(true); // Start loading
    const rawText = `CANT.\tFÚTBOL MASCULINO 2007-09\tOBSERVACIONES\tCANT.\tFÚTBOL FEMENINO 2007-09\n1\tBritish International School (Baq)\tA) Se realizarán dos grupos de 4 colegios y se jugarán 3 partidos del mismo grupo y 2 partidos intergrupos.\t1\tBritish Int. School (Baq)\n2\tAnglocolombiano (Bog)\tB) Jugarán en las canchas de: Monómeros 1 (masculino) y Monómeros 2 (femenino).\t2\tEnglish School (Bog)\n3\tGim. Colombo Británico (Bog)\tC) SOLINILLA 1, estará disponible del martes 10 al viernes 13 marzo. \t3\tAnglocolombiano (Bog)\n4\tK.C. Parrish (Baq)\t\t4\tMarymount (Baq)\n5\tBilingüe (Sta Marta)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t5\tBerckley (Baq)\n6\tSan José (Baq)\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t6\tPor confirmar\n7\tMarymount (Baq)\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n8\tPor confirmar\t\t\t\n\t\tE) MONÓMEROS, estará disponible en el siguiente horario:\t\t\n\t\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tFÚTBOL MASCULINO 2010-11\tOBSERVACIONES\tCANT.\tFÚTBOL MASCULINO 2010-11\n1\tBritish Int. School (Baq)\tA) Se realizarán dos grupos de 6 colegios y se jugarán 5 partidos del mismo grupo.\t7\tJefferson (Cali)\n2\tBureche (Sta Marta)\tB) Jugarán en las canchas de: Solinilla 1, 2 y 3\t8\tGim. Campestre (Montería)\n3\tVictoria School (Bog)\t     - Martes 10 marzo de 1:00 a 6:00 pm\t9\tBritánico (C/gena)\n4\tK.C. Parrish (Baq)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t10\tBilingüe (Sta Marta)\n5\tC. Colombo Británico (Cali)\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t11\tGim. Colombo Británico (Bog)\n6\tPor confirmar\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t12\tVermont (Medellín)\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tFÚTBOL MASCULINO 2012-13\tOBSERVACIONES\t\t\n1\tBritish Int. School (Baq) Rojo\tA) Se realizarán dos grupos de 4 colegios y se jugarán 3 partidos del mismo grupo y 2 partidos intergrupos.\t\t\n2\tWingate (México)\tB) Jugará en la cancha de: Universidad Simón Bolívar sede Salgar y British 1 externa F11\t\t\n3\tJefferson (Cali)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n4\tGim. Campestre (Montería)\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n5\tGim. del Norte (Valledupar)\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n6\tBilingüe (Sta Marta)\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n7\tRoyal School (Baq)\t\t\t\n8\tPor confirmar\t\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tFÚTBOL FEMENINO 2010-11\tOBSERVACIONES\t\t\n1\tK.C. Parrish (Baq)\tA) Se realizará 1 grupo de 4 colegios y se jugarán 3 partidos fase de grupo, luego semis y final.\t\t\n2\tAspaen (C/gena)\tB) Jugará en la cancha de: Solinilla 2.\t\t\n3\tBritánico (C/gena)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n4\tMaría Mancilla (Pto Colombia)\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tFÚTBOL 7 FEMENINO 2012-13\tOBSERVACIONES\t\t\n1\tBritish Int. School (Baq)\tA) Se realizará 1 grupo de 4 colegios y se jugarán 3 partidos fase de grupo, luego semis y final.\t\t\n2\tWingate (México)\tB) Jugará en la cancha de: British 2 interna F7\t\t\n3\tVictoria School (Bog)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n4\tJefferson (Cali)\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\nBALONCESTO. Se jugarán 4 tiempos de 10 minutos, con 7 de descanso en todas las categorías y géneros. Se programan partidos cada hora y 10 minutos. Y para que un equipo juegue su 2do partido del día debe tener al menos una hora de descanso.\t\t\t\t\nCANT.\tBALONCESTO FEMENINO 2007-09\tOBSERVACIONES\t\t\n1\tCIEDI (Bog)\tA) Se realizará 1 grupo de 4 colegios y se jugarán 3 partidos fase de grupo, luego semis y final.\t\t\n2\tGim. Colombo Británico (Bog)\tB) Jugará en la cancha de: British 1 y 2\t\t\n3\tCorales (Baq)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n4\tPor confirmar\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tBALONCESTO MASCULINO 2007-09\tOBSERVACIONES\t\t\n1\tBritish International School (Baq)\tA) Se realizará 1 grupo de 5 colegios y se jugarán 4 partidos fase de grupo. Luego el 1ero del grupo avanza a final y espera rival entre 2do vs 3ero. 4to y 5to juegan por posición del torneo.\t\t\n2\tGim. Campestre (Montería)\tB) Jugará en la cancha de: British 1 y 2\t\t\n3\tGim. Colombo Británico (Bog)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n4\tSan José (Baq)\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n5\tEnglish School (Bog)\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tBALONCESTO MASCULINO 2010-11\tOBSERVACIONES\tCANT.\tBALONCESTO MASCULINO 2010-11\n1\tBritish Int. School (Baq)\tA) Se realizarán 2 grupos de 5 colegios y se jugarán 4 partidos fase de grupo y 1 intergrupo. Avanzan a final el 1ero de cada grupo y los 2dos van por la medalla de bronce.\t6\tBureche (Sta Marta)\n2\tMarymount (Baq)\tB) Jugará en la cancha de: British 1 y 2\t7\tRoyal School (Baq)\n3\tAnglocolombiano (Bog)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t8\tAlemán (Baq)\n4\tVermont (Medellín)\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t9\tPor confirmar\n5\tJefferson (Cali)\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t10\tMontessori (Med)\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tBALONCESTO MASCULINO 2012-13\tOBSERVACIONES\t\t\n1\tAnglocolombiano (Bog)\tA) Se realizará 1 grupo de 6 colegios y se jugarán 5 partidos fase de grupo. Luego el 1ero y 2do juegan por la final y 3ero vs 4to por la medalla de bronce.\t\t\n2\tColumbus (Medellín)\tB) Jugará en la cancha de: British 1 y 2\t\t\n3\tBritánico (C/gena)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n4\tK.C. Parrish (Baq)\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n5\tHebreo Unión (Baq)\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n6\tAlemán (Baq)\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tVOLEIBOL FEMENINO 2007-09\tOBSERVACIONES\t\t\n1\tBritish International School (Baq)\tA) Se realizarán 2 grupos de 5 colegios y se jugarán 4 partidos fase de grupo y 1 intergrupo. Avanzan a final el 1ero de cada grupo y los 2dos van por la medalla de bronce.\t6\tHartford (Baq)\n2\tGim. Colombo Británico (Bog)\tB) Se jugará en las canchas: Marathon gym, British sol y Sugar 1, 2 y 3.\t7\tSan José (Baq)\n3\tK.C. Parrish (Baq)\tC) El torneo debe finalizar el viernes 13 marzo máximo 4:00pm\t8\tHebreo Unión (Baq)\n4\tC. Colombo Británico (Cali)\t     - Viernes 6 marzo, de 1:30 a 6:00pm\t9\tAlemán (Baq)\n5\tMarymount (Baq)\t     - Sábado 7 marzo, de 8:00 a 1:00am\t10\tSan Viator (Tunja)\n\t\t     - Lunes 9 marzo, de 3:00 a 6:00pm\t\t\n\t\t     - Martes 10 marzo, de 3:00 a 6:00pm\t\t\n\t\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\nVOLEIBOL. Se jugarán al ganador de 2 set de 3. Los dos primeros set se juegan a 25 puntos; el tercer set se juega en caso de empate a 15 puntos. Se programan partidos cada hora y 15 minutos. Un equipo puede jugar máximo 2 partidos seguidos.\t\t\t\t\nCANT.\tVOLEIBOL FEMENINO 2010-11\tOBSERVACIONES\t\t\n1\tBritish Int. School (Baq)\tA) Se realizarán 2 grupos de 7 colegios y se jugarán 6 partidos fase de grupo. Avanzan a final el 1ero de cada grupo y los 2dos van por la medalla de bronce.\t8\tGim. Campestre (Montería)\n2\tComfamliar (Baq)\tB) Se jugará en las canchas: Marathon gym, British sol y Sugar 1, 2 y 3.\t9\tGim. Del Norte (Valledupar)\n3\tWingate (México)\t     - Viernes 6 marzo, de 1:30 a 6:00pm\t10\tLos Corales (Baq)\n4\tGim. Colombo Británico (Bog)\t     - Sábado 7 marzo, de 8:00 a 1:00am\t11\tBureche (Sta Marta)\n5\tBritánico (C/gena)\t     - Lunes 9 marzo, de 3:00 a 6:00pm\t12\tAspaen (C/gena)\n6\tLic. T. S. Miguel (Pereira)\t     - Martes 10 marzo, de 3:00 a 6:00pm\t13\tHartford (Baq)\n7\tBilingüe (Sta Marta)\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t14\tAlemán (Baq)\n\t\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tVOLEIBOL FEMENINO 2012-13\tOBSERVACIONES\t\t\n1\tBritish Int. School (Baq)\tA) Se realizarán 2 grupos de 5 colegios y se jugarán 4 partidos fase de grupo y 1 intergrupo. Avanzan a final el 1ero de cada grupo y los 2dos van por la medalla de bronce.\t6\tGim. Campestre (Montería)\n2\tWingate (México)\tB) Se jugará en las canchas: Marathon gym y British techo\t7\tAlemán (Baq)\n3\tVictoria School (Bog)\t     - Viernes 6 marzo, de 1:30 a 6:00pm\t8\tComfamiliar (Baq)\n4\tK.C. Parrish (Baq)\t     - Sábado 7 marzo, de 8:00 a 1:00am\t9\tLic. T. S. Miguel (Pereira)\n5\tGim. Del Norte (Valledupar)\t     - Lunes 9 marzo, de 3:00 a 6:00pm\t10\tPor confirmar\n\t\t     - Martes 10 marzo, de 3:00 a 6:00pm\t\t\n\t\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm\t\t\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t\nCANT.\tVOLEIBOL MASCULINO 2007-09\tOBSERVACIONES\t\t\n1\tAnglocolombiano (Bog)\tA) Se realizará 1 grupo de 6 colegios y se jugarán 5 partidos en fase de grupo. Avanzan a final el 1ero y el 2do. Mientras que 3ero y 4to van por la medalla de bronce.\t\t\n2\tLic. Taller S. Miguel (Pereira)\tC) El torneo debe finalizar el viernes 13 marzo máximo 4:00pm\t\t\n3\tK.C. Parrish (Baq)\tB) Se jugará en las canchas: Marathon gym, British sol y Sugar 1, 2 y 3.\t\t\n4\tSan José (Baq)\t     - Viernes 6 marzo, de 1:30 a 6:00pm\t\t\n5\tAlemán (Baq)\t     - Sábado 7 marzo, de 8:00 a 1:00am\t\t\n6\tBritánico (C/gena)\t     - Lunes 9 marzo, de 3:00 a 6:00pm\t\t\n\t\t     - Martes 10 marzo, de 3:00 a 6:00pm\t\t\n\t\t     - Miércoles 11 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Jueves 12 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Viernes 13 marzo de 8:00 a 6:00 pm\t\t\n\t\t     - Sábado 14 marzo de 8:00 a 2:00pm`;

    console.log("Extracting tournament schedule...");
    const schedule = await extractTournamentSchedule(rawText);
    if (schedule) {
      console.log("Tournament Schedule Extracted:", schedule);
      await processAndSaveTournamentSchedule(schedule);
    } else {
      console.error("Failed to extract tournament schedule.");
    }
    setIsProcessingLLM(false); // End loading
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-indigo-600 text-xl font-semibold">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Router>
        {currentUser && <Navbar onNavigate={handleNavigate} activePage={activePage} />}
        <main className="container mx-auto py-8">
          <Routes>
            <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/register" element={currentUser ? <Navigate to="/dashboard" /> : <Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard
                    teams={teams}
                    players={players}
                    matches={matches}
                    events={events}
                    onNavigateToLiveScoring={(matchId) => handleNavigate('liveScoring', { matchId })}
                    onNavigateToResults={(matchId) => handleNavigate('results', { matchId })}
                    allSchools={allSchools}
                    allSports={allSports}
                    allCategories={allCategories}
                    gendersList={gendersList}
                    sportEventTypesMap={SPORT_EVENT_TYPES_MAP}
                    sportScoreTermMap={SPORT_SCORE_TERM_MAP}
                    primaryScoringEventTypesMap={PRIMARY_SCORING_EVENT_TYPES_MAP}
                    onNavigate={handleNavigate}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Calendar
                    teams={teams}
                    matches={matches}
                    addMatch={handleAddMatch}
                    onNavigateToLiveScoring={(matchId) => handleNavigate('liveScoring', { matchId })}
                    onNavigateToResults={(matchId) => handleNavigate('results', { matchId })}
                    allSchools={allSchools}
                    allSports={allSports}
                    allCategories={allCategories}
                    gendersList={gendersList}
                    onNavigate={handleNavigate}
                    onExtractTournamentSchedule={handleExtractTournamentSchedule}
                    isProcessingLLM={isProcessingLLM}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/liveScoring/:matchId?"
              element={
                <ProtectedRoute>
                  <LiveScoring
                    teams={teams}
                    players={players}
                    matches={matches}
                    events={events}
                    allSports={allSports}
                    allCategories={allCategories}
                    sportEventTypesMap={SPORT_EVENT_TYPES_MAP}
                    primaryScoringEventTypesMap={PRIMARY_SCORING_EVENT_TYPES_MAP}
                    sportScoreTermMap={SPORT_SCORE_TERM_MAP}
                    initialMatchId={navigateOptions?.matchId}
                    onNavigate={handleNavigate}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/:matchId?"
              element={
                <ProtectedRoute>
                  <Results
                    teams={teams}
                    players={players}
                    matches={matches}
                    events={events}
                    allSports={allSports}
                    allCategories={allCategories}
                    sportEventTypesMap={SPORT_EVENT_TYPES_MAP}
                    primaryScoringEventTypesMap={PRIMARY_SCORING_EVENT_TYPES_MAP}
                    sportScoreTermMap={SPORT_SCORE_TERM_MAP}
                    initialMatchId={navigateOptions?.matchId}
                    onNavigate={handleNavigate}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/statistics"
              element={
                <ProtectedRoute>
                  <Statistics
                    teams={teams}
                    players={players}
                    matches={matches}
                    events={events}
                    allSports={allSports}
                    allCategories={allCategories}
                    gendersList={gendersList}
                    sportEventTypesMap={SPORT_EVENT_TYPES_MAP}
                    primaryScoringEventTypesMap={PRIMARY_SCORING_EVENT_TYPES_MAP}
                    sportScoreTermMap={SPORT_SCORE_TERM_MAP}
                    initialPlayerTab={navigateOptions?.playerTab}
                    onNavigate={handleNavigate}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/standings"
              element={
                <ProtectedRoute>
                  <Standings
                    teams={teams}
                    matches={matches}
                    allSports={allSports}
                    allCategories={allCategories}
                    gendersList={gendersList}
                    onNavigate={handleNavigate}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <TeamsPage
                    teams={teams}
                    players={players}
                    matches={matches}
                    allSchools={allSchools}
                    allSports={allSports}
                    allCategories={allCategories}
                    gendersList={gendersList}
                    initialTeamId={navigateOptions?.teamId}
                    onNavigate={handleNavigate}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schools"
              element={
                <ProtectedRoute>
                  <SchoolsPage
                    allSchools={allSchools}
                    teams={teams}
                    players={players}
                    matches={matches}
                    allSports={allSports}
                    allCategories={allCategories}
                    gendersList={gendersList}
                    initialSchoolId={navigateOptions?.schoolId}
                    onNavigate={handleNavigate}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players"
              element={
                <ProtectedRoute>
                  <PlayersPage
                    players={players}
                    teams={teams}
                    events={events}
                    allSports={allSports}
                    allCategories={allCategories}
                    gendersList={gendersList}
                    onNavigate={handleNavigate}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registerTeamsPlayers"
              element={
                <ProtectedRoute requiredRole="editor">
                  <RegisterTeamsPlayers
                    teams={teams}
                    players={players}
                    allSchools={allSchools}
                    allSports={allSports}
                    allCategories={allCategories}
                    gendersList={gendersList}
                    onNavigate={handleNavigate}
                  />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        {/* The LLM extraction button is now moved to the Calendar page */}
      </Router>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  </AuthProvider>
);

export default App;
