
import React, { useState, useMemo, useCallback, useContext } from 'react';
import { Match, Team, MatchStatus, Sport, Category, Gender, FilterOptions, FullMatchData, mapToSupabaseMatchStatus, SchoolData, SportData, CategoryData } from '../types';
import MatchCard from '../components/MatchCard';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import FilterPanel from '../components/FilterPanel';
import Modal from '../components/Modal';
// Removed import from constants.ts
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext'; // Import the notification hook
import { supabase, fetchSportCategoryGenderSchoolIDs } from '../services/supabaseClient'; // Import supabase client

type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players' | 'registerTeamsPlayers';
interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
  matchId?: string; // Added for liveScoring to jump to specific match
}

interface CalendarProps {
  teams: Team[];
  matches: Match[];
  addMatch: (newMatch: Match) => void;
  onNavigateToLiveScoring: (matchId: string) => void; // This will now go to LiveScoring's detail view
  onNavigateToResults: (matchId: string) => void;
  // New props for dynamic lists
  allSchools: SchoolData[];
  allSports: SportData[]; // Changed to SportData[]
  allCategories: CategoryData[];
  gendersList: Gender[];
  onNavigate: (page: Page, options?: NavigateOptions) => void; // Added for MatchCard links
  onExtractTournamentSchedule: () => Promise<void>;
  isProcessingLLM: boolean;
}

const Calendar: React.FC<CalendarProps> = ({ 
  teams, 

  matches, 
  addMatch, 
  onNavigateToLiveScoring, 
  onNavigateToResults,
  allSchools,
  allSports, 
  allCategories,
  gendersList,
  onNavigate, 
  onExtractTournamentSchedule,
  isProcessingLLM,
}) => {
  console.log("Calendar component received teams:", teams);
  const { currentUser } = useContext(AuthContext);
  const isEditor = currentUser?.role === 'editor';
  const { showNotification } = useNotification(); // Use the notification hook

  const [isNewMatchModalOpen, setIsNewMatchModalOpen] = useState(false);
  const [newMatchData, setNewMatchData] = useState<Partial<Match>>({
    sport: undefined,
    category: undefined,
    gender: undefined,
    team1_id: undefined,
    team2_id: undefined,
    match_date: '',
    location: '',
  });
  const [isGenerating, setIsGenerating] = useState(false); // New state for loading indicator

  const [filters, setFilters] = useState<FilterOptions>({
    sport: 'all',
    category: 'all',
    gender: 'all',
    school: 'all',
    date: ''
  });

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      sport: 'all',
      category: 'all',
      gender: 'all',
      school: 'all',
      date: '',
    });
  }, []);

  const availableSportsOptions = useMemo(() => ([
    { value: '', label: 'Seleccionar Deporte' },
    ...allSports.map(sport => ({ value: sport.name, label: sport.name }))
  ]), [allSports]);

  const availableCategoriesOptions = useMemo(() => {
    if (newMatchData.sport) {
      // Need to find the SportData object to get its ID for filtering categories
      const selectedSportData = allSports.find(s => s.name === newMatchData.sport);
      const filtered = allCategories.filter(c => c.sport_id === selectedSportData?.id);
      
      const uniqueNames = new Set<string>();
      const options: { value: string; label: string }[] = [];
      
      filtered.forEach(cat => {
        if (!uniqueNames.has(cat.name)) {
          uniqueNames.add(cat.name);
          options.push({ value: cat.name, label: cat.name });
        }
      });
      
      return [
        { value: '', label: 'Seleccionar Categoría' },
        ...options
      ];
    }
    return [{ value: '', label: 'Seleccionar Categoría' }];
  }, [newMatchData.sport, allCategories, allSports]);

  const availableGendersOptions = useMemo(() => ([
    { value: '', label: 'Seleccionar Género' },
    ...gendersList.map(gender => ({ value: gender, label: gender }))
  ]), [gendersList]);

  const availableSchoolsOptions = useMemo(() => ([
    { value: '', label: 'Seleccionar Colegio' },
    ...allSchools.map(school => ({ value: school.name, label: school.name }))
  ]), [allSchools]);

  const filteredTeamsForNewMatch = useMemo(() => {
    const filtered = teams.filter(team =>
      (newMatchData.sport === undefined || team.sport.name === newMatchData.sport) &&
      (newMatchData.category === undefined || team.category.name === newMatchData.category) &&
      (newMatchData.gender === undefined || team.gender === newMatchData.gender)
    );
    console.log("Filtered teams for new match:", filtered);
    return filtered;
  }, [teams, newMatchData.sport, newMatchData.category, newMatchData.gender]);

  const teamOptions = useMemo(() => {
    const options = [
      { value: '', label: 'Seleccionar Equipo' },
      ...filteredTeamsForNewMatch.map(team => ({
        value: team.id,
        label: `${team.school.name} - ${team.name}`
      }))
    ];
    console.log("Team options for dropdown:", options);
    return options;
  }, [filteredTeamsForNewMatch]);

  const team2Options = useMemo(() => {
    return teamOptions.filter(option => option.value !== newMatchData.team1_id);
  }, [teamOptions, newMatchData.team1_id]);

  // Fix: Corrected property names in handleNewMatchInputChange to match the Match interface.
  const handleNewMatchInputChange = (field: keyof Match, value: string | Sport | Category | Gender) => {
    // Map fields to Supabase names
    const supabaseField = field === 'team1_id' ? 'team1_id' :
                          field === 'team2_id' ? 'team2_id' :
                          field === 'match_date' ? 'match_date' :
                          field;
    setNewMatchData(prev => ({ ...prev, [supabaseField]: value }));
    if (field === 'sport') {
      setNewMatchData(prev => ({ ...prev, category: undefined, team1_id: undefined, team2_id: undefined }));
    }
    if (field === 'category' || field === 'gender') {
      setNewMatchData(prev => ({ ...prev, team1_id: undefined, team2_id: undefined }));
    }
    if (field === 'team1_id') {
      setNewMatchData(prev => {
        if (prev.team2_id === value) {
          return { ...prev, team2_id: undefined };
        }
        return prev;
      });
    }
  };

  const handleScheduleMatch = async () => {
    if (!newMatchData.sport || !newMatchData.category || !newMatchData.gender ||
        !newMatchData.team1_id || !newMatchData.team2_id || !newMatchData.match_date || !newMatchData.location) {
      showNotification('Por favor, completa todos los campos para programar el partido.', 'warning');
      return;
    }

    const team1 = teams.find(t => t.id === newMatchData.team1_id);
    const team2 = teams.find(t => t.id === newMatchData.team2_id);

    if (!team1 || !team2) {
      showNotification('Equipos no encontrados. Por favor, selecciona equipos válidos.', 'error');
      return;
    }

    const newMatchPayload = {
      sport: newMatchData.sport,
      category: newMatchData.category,
      gender: newMatchData.gender,
      team1_id: newMatchData.team1_id,
      team2_id: newMatchData.team2_id,
      match_date: newMatchData.match_date,
      location: newMatchData.location,
      status: mapToSupabaseMatchStatus(MatchStatus.PROGRAMADO),
      team1_score: 0,
      team2_score: 0,
    };

    const { data, error } = await supabase.from('matches').insert(newMatchPayload).select('*').single();

    if (error) {
      console.error('Error al programar el partido:', error);
      showNotification('Error al programar el partido: ' + error.message, 'error');
    } else {
      // Re-fetch data in App.tsx to update all contexts
      addMatch(data); // Pass the new match (mapped by App.tsx) to update state
      setIsNewMatchModalOpen(false);
      setNewMatchData({ // Reset form
        sport: undefined, category: undefined, gender: undefined,
        team1_id: undefined, team2_id: undefined, match_date: '', location: '',
      });
      showNotification('Partido programado exitosamente!', 'success'); // Changed from alert to showNotification
    }
  };

  const handleGenerateRandomTournament = useCallback(async () => {
    console.log('handleGenerateRandomTournament called');
    if (!isEditor) {
      showNotification('Necesitas permisos de Editor para generar torneos.', 'error');
      console.log('Permission denied: Not an editor.');
      return;
    }

    if (!window.confirm('¿Estás seguro de que quieres generar un torneo aleatorio? Esto añadirá nuevos partidos de "todos contra todos" para cada grupo.')) {
      console.log('Tournament generation cancelled by user.');
      return;
    }

    setIsGenerating(true); // Start loading
    console.log('Starting tournament generation...');

    const newMatchesPayload: any[] = [];
    const possibleLocations = ['Cancha Principal A', 'Cancha Principal B', 'Coliseo Principal', 'Pista 1', 'Pista 2', 'Campo X'];

    // Group teams by sport, category, and gender
    const groupedTeams: { [key: string]: Team[] } = {};
    teams.forEach(team => {
      const key = `${team.sport.name}-${team.category.name}-${team.gender}`;
      if (!groupedTeams[key]) {
        groupedTeams[key] = [];
      }
      groupedTeams[key].push(team);
    });
    console.log('Teams grouped:', groupedTeams);


    Object.values(groupedTeams).forEach(teamsInGroup => {
      if (teamsInGroup.length < 2) {
        console.log(`Skipping group: Not enough teams (${teamsInGroup.length}) for round-robin.`, teamsInGroup[0]?.sport.name, teamsInGroup[0]?.category.name, teamsInGroup[0]?.gender);
        return; // Need at least two teams to make a match
      }

      // Implement Round-Robin: "todos contra todos"
      for (let i = 0; i < teamsInGroup.length; i++) {
        for (let j = i + 1; j < teamsInGroup.length; j++) { // Start j from i + 1 to avoid self-play and duplicate pairs
          const team1 = teamsInGroup[i];
          const team2 = teamsInGroup[j];

          // Opcional: Saltar si los equipos son del mismo colegio
          if (team1.school.id === team2.school.id) {
            console.log(`Skipping match between teams from same school: ${team1.name} (${team1.school.name}) vs ${team2.name} (${team2.school.name})`);
            continue; 
          }

          const randomDays = Math.floor(Math.random() * 14) + 1; // 1 to 14 days in future
          const randomHour = Math.floor(Math.random() * (18 - 9 + 1)) + 9; // 9 AM to 6 PM
          const randomMinute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45 minutes

          const matchDate = new Date();
          matchDate.setDate(matchDate.getDate() + randomDays);
          matchDate.setHours(randomHour, randomMinute, 0, 0);

          const randomLocation = possibleLocations[Math.floor(Math.random() * possibleLocations.length)];

          newMatchesPayload.push({
            sport: team1.sport.name,
            category: team1.category.name,
            gender: team1.gender,
            team1_id: team1.id,
            team2_id: team2.id,
            match_date: matchDate.toISOString().slice(0, 16),
            location: randomLocation,
            status: mapToSupabaseMatchStatus(MatchStatus.PROGRAMADO),
            team1_score: 0,
            team2_score: 0,
          });
        }
      }
    });

    console.log('Matches prepared:', newMatchesPayload.length);

    if (newMatchesPayload.length > 0) {
      console.log('Inserting matches into Supabase...');
      const { error } = await supabase.from('matches').insert(newMatchesPayload);
      if (error) {
        console.error('Error al generar partidos aleatorios:', error);
        showNotification('Error al generar partidos aleatorios: ' + error.message, 'error');
      } else {
        console.log('Matches successfully inserted. Triggering data re-fetch.');
        // Trigger a full re-fetch in App.tsx to update all state
        newMatchesPayload.forEach(match => addMatch(match)); // This will trigger a re-fetch in App.tsx
        showNotification(`Se generaron ${newMatchesPayload.length} nuevos partidos aleatorios en formato "todos contra todos".`, 'success');
      }
    } else {
      console.log('No new matches generated. Payload was empty.');
      showNotification('No se pudieron generar partidos aleatorios. Asegúrate de tener al menos dos equipos por grupo de deporte/categoría/género, y que no se enfrenten equipos del mismo colegio.', 'info');
    }
    setIsGenerating(false); // End loading
    console.log('Tournament generation finished.');

  }, [teams, isEditor, addMatch, showNotification]);


  const allMatchesWithTeams = useMemo(() => {
    return matches.map(match => {
      const team1 = teams.find(t => t.id === match.team1_id);
      const team2 = teams.find(t => t.id === match.team2_id);
      return team1 && team2 ? { match, team1, team2 } : null;
    }).filter(Boolean) as { match: Match; team1: Team; team2: Team }[];
  }, [matches, teams]);

  const filteredAndSortedMatches = useMemo(() => {
    return allMatchesWithTeams
      .filter(({ match, team1, team2 }) => {
        if (filters.sport !== 'all' && match.sport !== filters.sport) return false;
        if (filters.category !== 'all' && match.category !== filters.category) return false;
        if (filters.gender !== 'all' && match.gender !== filters.gender) return false;
        if (filters.school !== 'all' && filters.school !== undefined && team1.school.name !== filters.school && team2.school.name !== filters.school) return false;
        if (filters.date && !match.match_date.startsWith(filters.date)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.match.match_date).getTime() - new Date(b.match.match_date).getTime());
  }, [allMatchesWithTeams, filters]);

  const getMatchCardOnClick = useCallback((match: Match) => {
    if (match.status === MatchStatus.EN_VIVO) {
      return onNavigateToLiveScoring; // Navigate to LiveScoring's detail view
    }
    return onNavigateToResults;
  }, [onNavigateToLiveScoring, onNavigateToResults]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold text-gray-800">Calendario de Partidos</h1>
        {isEditor && (
          <div className="flex gap-3">
            <Button onClick={() => setIsNewMatchModalOpen(true)} variant="primary">
              + Programar Nuevo Partido
            </Button>
            <Button onClick={handleGenerateRandomTournament} variant="primary" disabled={isGenerating}>
              {isGenerating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </span>
              ) : (
                'Generar Torneo Aleatorio'
              )}
            </Button>
            <Button
              onClick={onExtractTournamentSchedule}
              variant="primary"
              disabled={isProcessingLLM}
              className={`${isProcessingLLM ? 'opacity-50 cursor-not-allowed' : ''}`} 
            >
              {isProcessingLLM ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando LLM...
                </span>
              ) : (
                'Extraer Horario de Torneo (LLM)'
              )}
            </Button>
          </div>
        )}
      </div>

      {!isEditor && (
        <div className="mb-6 p-4 rounded-md bg-blue-100 border-blue-500 text-blue-700" role="alert" aria-live="polite">
          <p className="font-semibold">Modo Espectador:</p>
          <p>Puedes ver todos los partidos programados, en vivo y finalizados. Solo los editores pueden programar nuevos partidos, generar torneos y gestionar eventos en vivo.</p>
        </div>
      )}

      <FilterPanel 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        showDateFilter={true} 
        showSchoolFilter={true} 
        clearFilters={clearFilters} 
        allSchools={allSchools}
        allSports={allSports} // Pass SportData[] directly
        allCategories={allCategories}
        gendersList={gendersList}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedMatches.length > 0 ? (
          filteredAndSortedMatches.map(({ match, team1, team2 }) => (
            <MatchCard
              key={match.id}
              match={match}
              team1={team1}
              team2={team2}
              onClick={getMatchCardOnClick(match)}
              showScore={match.status !== MatchStatus.PROGRAMADO}
              onNavigate={onNavigate} // Pass onNavigate to MatchCard
              // New aria-label logic
              ariaLabel={
                match.status === MatchStatus.EN_VIVO
                  ? isEditor
                    ? `Gestionar partido en vivo: ${team1.name} vs ${team2.name}`
                    : `Ver partido en vivo: ${team1.name} vs ${team2.name}`
                  : `Ver detalles del partido: ${team1.name} vs ${team2.name}`
              }
            />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-600">No hay partidos que coincidan con los filtros.</p>
        )}
      </div>

      {isEditor && (
        <Modal
          isOpen={isNewMatchModalOpen}
          onClose={() => setIsNewMatchModalOpen(false)}
          title="Programar Nuevo Partido"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsNewMatchModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleScheduleMatch}>Programar Partido</Button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dropdown
              options={availableSportsOptions}
              value={newMatchData.sport || ''}
              onChange={(val) => handleNewMatchInputChange('sport', val as Sport)}
              placeholder="Seleccionar Deporte"
              className="w-full"
            />
            <Dropdown
              options={availableCategoriesOptions}
              value={newMatchData.category || ''}
              onChange={(val) => handleNewMatchInputChange('category', val as Category)}
              placeholder="Seleccionar Categoría"
              className="w-full"
              disabled={!newMatchData.sport}
            />
            <Dropdown
              options={availableGendersOptions}
              value={newMatchData.gender || ''}
              onChange={(val) => handleNewMatchInputChange('gender', val as Gender)}
              placeholder="Seleccionar Género"
              className="w-full"
            />
            <Dropdown
              options={teamOptions}
              value={newMatchData.team1_id || ''}
              onChange={(val) => handleNewMatchInputChange('team1_id', val)}
              placeholder="Equipo Local"
              className="w-full"
              disabled={!newMatchData.sport || !newMatchData.category || !newMatchData.gender}
            />
            <Dropdown
              options={team2Options}
              value={newMatchData.team2_id || ''}
              onChange={(val) => handleNewMatchInputChange('team2_id', val)}
              placeholder="Equipo Visitante"
              className="w-full"
              disabled={!newMatchData.sport || !newMatchData.category || !newMatchData.gender || !newMatchData.team1_id || team2Options.length <= 1}
            />
            <input
              type="datetime-local"
              value={newMatchData.match_date}
              onChange={(e) => handleNewMatchInputChange('match_date', e.target.value)}
              className="w-full"
            />
            <input
              type="text"
              placeholder="Ubicación/Cancha"
              value={newMatchData.location}
              onChange={(e) => handleNewMatchInputChange('location', e.target.value)}
              className="w-full"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Calendar;