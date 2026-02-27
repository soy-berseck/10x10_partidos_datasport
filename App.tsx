
import React, { useState, useEffect, useCallback, useContext } from 'react';

import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import LiveScoring from './pages/LiveScoring';
import Results from './pages/Results';
import Statistics from './pages/Statistics';
import Standings from './pages/Standings';
import Teams from './pages/Teams';
import Schools from './pages/Schools';
import Players from './pages/Players'; // Importar la nueva página de Jugadores
import RegisterTeamsPlayers from './pages/RegisterTeamsPlayers'; // Importar la nueva página de registro
import GenerateSchedule from './pages/GenerateSchedule'; // Import the new page
import LoginPage from './pages/LoginPage';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Team, Player, Match, Event, mapToSupabaseMatchStatus, mapToSupabaseEventType, SchoolData, SportData, CategoryData, Gender, Sport, Category, EventType, Page } from './types'; // Import Page type
import { supabase, mapSupabaseTeamToAppTeam, mapSupabasePlayerToAppPlayer, mapSupabaseMatchToAppMatch, mapSupabaseEventToAppEvent } from './services/supabaseClient';
import { SPORT_EVENT_TYPES_MAP, SPORT_SCORE_TERM_MAP, PRIMARY_SCORING_EVENT_TYPES_MAP } from './utils/sportConfig'; // Import from new util file

interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean; // For statistics page to jump to player tab
  matchId?: string; // For liveScoring to jump to specific match
  playerId?: string; // New: For players page to jump to specific player detail
}

// Main App component
const App: React.FC = () => {
  const { isAuthenticated, currentUser, login } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedRole, setSelectedRole] = useState<'reader' | 'editor' | null>(() => {
    // Initialize selectedRole from sessionStorage if available
    const storedRole = sessionStorage.getItem('selectedRole');
    return storedRole === 'reader' || storedRole === 'editor' ? storedRole : null;
  });

  // Handle role selection and login
  const handleRoleSelect = useCallback(async (role: 'reader' | 'editor') => {
    setSelectedRole(role);
    sessionStorage.setItem('selectedRole', role);
    await login(role);
  }, [login]);
  
  const [allSchools, setAllSchools] = useState<SchoolData[]>([]);
  const [allSports, setAllSports] = useState<SportData[]>([]); // This holds SportData[]
  const [allCategories, setAllCategories] = useState<CategoryData[]>([]);

  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  const [activeLiveMatchId, setActiveLiveMatchId] = useState<string | null>(null); // Controls which live match is in detail view
  const [selectedMatchIdForResults, setSelectedMatchIdForResults] = useState<string | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null); // New state for selected team details
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null); // New state for selected school details
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null); // New state for selected player details
  const [activeStatsTab, setActiveStatsTab] = useState<'scorers' | 'assists' | 'cards' | 'byTeam' | 'byPlayer'>('scorers'); // New state for stats tab

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Genders List derived from Enum
  const GENDERS_LIST: Gender[] = Object.values(Gender);


  // Function to fetch all data from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 0. Fetch schools, sports, categories first for dynamic options and mapping
      const { data: schoolsData, error: schoolsError } = await supabase.from('schools').select('id, name, logo_url'); // Include logo_url
      if (schoolsError) throw schoolsError;
      // Map schoolsData to ensure 'name' is always a string
      const mappedSchoolsData: SchoolData[] = schoolsData.map((s: any) => ({
        id: s.id || '',
        name: s.name || 'Colegio Desconocido', // Ensure name is always a string
        logo_url: s.logo_url || undefined,
      }));
      setAllSchools(mappedSchoolsData);

      const { data: sportsData, error: sportsError } = await supabase.from('sports').select('id, name');
      if (sportsError) throw sportsError;
      setAllSports(sportsData); // Keep as SportData[]
      
      const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('id, name, gender, sport_id');
      if (categoriesError) throw categoriesError;
      setAllCategories(categoriesData);


      // 1. Fetch teams (without complex joins in initial select)
      const { data: teamsRaw, error: teamsError } = await supabase
        .from('teams')
        .select('*');
      if (teamsError) throw teamsError;

      // Manually fetch related data for each team using fetched lists
      const teamsWithJoins = teamsRaw.map((team: any) => {
        const school = mappedSchoolsData.find(s => s.id === team.school_id) || { id: '', name: 'Colegio Desconocido' }; // Use mappedSchoolsData
        const sport = sportsData.find(s => s.id === team.sport_id) || { id: '', name: Sport.FUTBOL };
        const category = categoriesData.find(c => c.id === team.category_id) || { id: '', name: 'General' as Category, gender: Gender.MASCULINO, sport_id: '' };
        
        return {
          ...team,
          school: school, // This `school` object *has* a `name` property.
          sport: sport,
          category: category,
          gender: category.gender, // Ensure gender is consistent with category
        };
      });
      setTeams(teamsWithJoins.map(mapSupabaseTeamToAppTeam));

      // 2. Fetch players (already simple)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*');
      if (playersError) throw playersError;
      setPlayers(playersData.map(mapSupabasePlayerToAppPlayer));

      // 3. Fetch matches (without complex joins in initial select)
      const { data: matchesRaw, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true });
      if (matchesError) throw matchesError;

      // Manually fetch related team/school data for each match
      const matchesWithJoins = await Promise.all(matchesRaw.map(async (match: any) => {
        const team1FullData = teamsWithJoins.find(t => t.id === match.team1_id);
        const team2FullData = teamsWithJoins.find(t => t.id === match.team2_id);

        return {
          ...match,
          team1: team1FullData ? { school: team1FullData.school } : { school: { id: '', name: 'Colegio Desconocido', logo_url: undefined } },
          team2: team2FullData ? { school: team2FullData.school } : { school: { id: '', name: 'Colegio Desconocido', logo_url: undefined } },
        };
      }));
      setMatches(matchesWithJoins.map(mapSupabaseMatchToAppMatch));

      // 4. Fetch events (already simple)
      const { data: eventsData, error: eventsError } = await supabase
        .from('match_events')
        .select('*');
      if (eventsError) throw eventsError;
      setEvents(eventsData.map(mapSupabaseEventToAppEvent));

    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err.message);
      setError('Error al cargar los datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data on mount
  useEffect(() => {
    fetchData();
    // Expose fetchData and handleNavigate globally for non-React parts (like the Excel import or schedule generation script)
    (window as any).fetchData = fetchData;
    (window as any).handleNavigate = handleNavigate;
  }, [fetchData]);

  // Unified navigation handler
  const handleNavigate = useCallback((page: Page, options?: NavigateOptions) => {
    console.log('Navigating to page:', page);
    setCurrentPage(page);
    setSelectedMatchIdForResults(null);
    setActiveTeamId(options?.teamId || null);
    setActiveSchoolId(options?.schoolId || null);
    
    // New: Set activePlayerId
    if (page === 'players') {
      setActivePlayerId(options?.playerId || null);
    } else {
      setActivePlayerId(null);
    }

    if (options?.playerTab) {
      setActiveStatsTab('byPlayer');
    } else {
      setActiveStatsTab('scorers');
    }

    // Special handling for liveScoring page
    if (page === 'liveScoring') {
      setActiveLiveMatchId(options?.matchId || null); // If no matchId, show overview
    } else {
      setActiveLiveMatchId(null); // Clear active live match for other pages
    }
  }, []);

  const handleAddMatch = useCallback(async (newMatch: Match) => {
    const { id, team1, team2, status, ...rest } = newMatch; // Exclude nested objects and ID (Supabase generates)
    const { data, error } = await supabase
      .from('matches')
      .insert({
        team1_id: rest.team1_id,
        team2_id: rest.team2_id,
        sport: rest.sport,
        category: rest.category,
        gender: rest.gender,
        match_date: rest.match_date,
        location: rest.location,
        status: mapToSupabaseMatchStatus(status),
        team1_score: rest.team1_score,
        team2_score: rest.team2_score,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error adding match:', error);
      setError('Error al añadir el partido: ' + error.message);
    } else if (data) {
      fetchData(); // Re-fetch to update local state and get full match data with joins
    }
  }, [fetchData]);

  const handleUpdateMatch = useCallback(async (updatedMatch: Match) => {
    const { id, team1, team2, status, ...rest } = updatedMatch; // Exclude nested objects
    const { error } = await supabase
      .from('matches')
      .update({
        team1_id: rest.team1_id,
        team2_id: rest.team2_id,
        sport: rest.sport,
        category: rest.category,
        gender: rest.gender,
        match_date: rest.match_date,
        location: rest.location,
        status: mapToSupabaseMatchStatus(status),
        team1_score: rest.team1_score,
        team2_score: rest.team2_score,
        live_timer_seconds: rest.live_timer_seconds,
        start_time_timestamp: rest.start_time_timestamp,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating match:', error);
      setError('Error al actualizar el partido: ' + error.message);
    } else {
      fetchData(); // Re-fetch to update local state
    }
  }, [fetchData]);


  const handleAddEvent = useCallback(async (newEvent: Event) => {
    const { id, event_type, ...rest } = newEvent; // Exclude ID (Supabase generates)
    const { data, error } = await supabase
      .from('match_events')
      .insert({
        match_id: rest.match_id,
        event_type: mapToSupabaseEventType(event_type), // Map enum to string
        player_id: rest.player_id,
        team_id: rest.team_id,
        minute: rest.minute,
        details: rest.details,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error adding event:', error);
      setError('Error al añadir el evento: ' + error.message);
    } else if (data) {
      fetchData(); // Re-fetch to update local state
    }
  }, [fetchData]);

  const handleRemoveEvent = useCallback(async (eventId: string) => {
    const { error } = await supabase
      .from('match_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error removing event:', error);
      setError('Error al eliminar el evento: ' + error.message);
    } else {
      fetchData(); // Re-fetch to update local state
    }
  }, [fetchData]);

  // This will now navigate to LiveScoring page in detail mode
  const handleNavigateToLiveScoring = useCallback((matchId: string) => {
    handleNavigate('liveScoring', { matchId });
  }, [handleNavigate]);

  // This will now return to LiveScoring page in overview mode
  const handleCloseLiveScoring = useCallback(() => {
    handleNavigate('liveScoring'); // Navigate to liveScoring overview
  }, [handleNavigate]);

  const handleNavigateToResults = useCallback((matchId: string) => {
    setSelectedMatchIdForResults(matchId);
    setCurrentPage('results');
  }, []);

  const resetSelectedMatchIdFromNav = useCallback(() => {
    setSelectedMatchIdForResults(null);
  }, []);

  // If a role is selected but not authenticated (e.g., after a refresh and session storage is cleared)
  // This will trigger a re-login with the selected role.
  useEffect(() => {
    if (selectedRole && !isAuthenticated) {
      login(selectedRole);
    }
  }, [selectedRole, isAuthenticated, login]);

  // If no role is selected, show role selection screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-6">Selecciona tu Modo</h1>
          <div className="flex gap-4">
            <button
              onClick={() => handleRoleSelect('reader')}
              className="btn-primary"
            >
              📖 Modo Lector
            </button>
            <button
              onClick={() => handleRoleSelect('editor')}
              className="btn-primary"
            >
              ✏️ Modo Editor
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-indigo-600 text-xl font-semibold">Autenticando...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-indigo-600 text-xl font-semibold">Cargando datos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-red-800 text-xl font-semibold p-4 border border-red-300 rounded-md">
          {error}
          <button onClick={fetchData} className="btn-primary ml-4">Reintentar</button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    return (
      <React.Fragment> {/* Use a fragment to wrap content */}
        {currentPage === 'dashboard' && (
          <Dashboard
            teams={teams}
            players={players}
            matches={matches}
            events={events}
            onNavigateToLiveScoring={handleNavigateToLiveScoring}
            onNavigateToResults={handleNavigateToResults}
            allSports={allSports} // Pass SportData[] directly
            allCategories={allCategories}
            allSchools={allSchools}
            gendersList={GENDERS_LIST}
            sportEventTypesMap={SPORT_EVENT_TYPES_MAP}
            sportScoreTermMap={SPORT_SCORE_TERM_MAP}
            primaryScoringEventTypesMap={PRIMARY_SCORING_EVENT_TYPES_MAP}
            onNavigate={handleNavigate} // Pass onNavigate
          />
        )}
        {currentPage === 'calendar' && (
          <Calendar
            teams={teams}
            matches={matches}
            addMatch={handleAddMatch}
            onNavigateToLiveScoring={handleNavigateToLiveScoring}
            onNavigateToResults={handleNavigateToResults}
            allSports={allSports} // Pass SportData[] directly
            allCategories={allCategories}
            allSchools={allSchools}
            gendersList={GENDERS_LIST}
            onNavigate={handleNavigate} // Pass onNavigate for MatchCard links
            onExtractTournamentSchedule={async () => { alert('Función LLM no disponible en esta versión.'); }}
            isProcessingLLM={false}
          />
        )}
        {currentPage === 'liveScoring' && (
          <LiveScoring
            teams={teams}
            players={players}
            matches={matches}
            events={events}
            updateMatch={handleUpdateMatch}
            addEvent={handleAddEvent}
            removeEvent={handleRemoveEvent}
            activeMatchId={activeLiveMatchId} // Pass activeLiveMatchId to LiveScoring
            onCloseLiveScoring={handleCloseLiveScoring} // Pass handler to return to overview
            onNavigate={handleNavigate} // Pass onNavigate for MatchCard links within LiveScoring
            sportEventTypesMap={SPORT_EVENT_TYPES_MAP}
          />
        )}
        {currentPage === 'results' && (
          <Results
            teams={teams}
            players={players}
            matches={matches}
            events={events}
            selectedMatchIdFromNav={selectedMatchIdForResults}
            resetSelectedMatchIdFromNav={resetSelectedMatchIdFromNav}
            allSchools={allSchools}
            allSports={allSports} // Pass SportData[] directly
            allCategories={allCategories}
            gendersList={GENDERS_LIST}
            sportEventTypesMap={SPORT_EVENT_TYPES_MAP}
            sportScoreTermMap={SPORT_SCORE_TERM_MAP}
            onNavigate={handleNavigate} // Pass onNavigate for MatchCard links
          />
        )}
        {currentPage === 'statistics' && (
          <Statistics
            teams={teams}
            players={players}
            matches={matches}
            events={events}
            allSchools={allSchools}
            allSports={allSports} // Pass SportData[] directly
            allCategories={allCategories}
            gendersList={GENDERS_LIST}
            sportEventTypesMap={SPORT_EVENT_TYPES_MAP}
            sportScoreTermMap={SPORT_SCORE_TERM_MAP}
            primaryScoringEventTypesMap={PRIMARY_SCORING_EVENT_TYPES_MAP}
            activeTab={activeStatsTab} // Pass active tab state
            onTabChange={setActiveStatsTab} // Pass tab change handler
            onNavigate={handleNavigate} // Pass for any deep navigation from stats
          />
        )}
        {currentPage === 'standings' && (
          <Standings
            teams={teams}
            matches={matches}
            allSports={allSports} // Pass SportData[] directly
            allCategories={allCategories}
            gendersList={GENDERS_LIST}
            sportScoreTermMap={SPORT_SCORE_TERM_MAP}
          />
        )}
        {currentPage === 'teams' && (
          <Teams 
            teams={teams} 
            players={players} // Pass players for team details
            allSports={allSports} // Pass SportData[] directly
            allCategories={allCategories}
            gendersList={GENDERS_LIST}
            activeTeamId={activeTeamId} // Pass activeTeamId
            onNavigate={handleNavigate} // Pass onNavigate for deeper navigation
            onViewPlayerDetails={(playerId) => handleNavigate('players', { playerId })} // New: Pass handler for player details
          />
        )}
        {currentPage === 'schools' && ( // Nueva página de Colegios
          <Schools
            allSchools={allSchools}
            teams={teams} // Pass teams for school details
            activeSchoolId={activeSchoolId} // Pass activeSchoolId
            onNavigate={handleNavigate} // Pass onNavigate for deeper navigation
          />
        )}
        {currentPage === 'players' && ( // Nueva página de Jugadores
          <Players
            players={players}
            teams={teams} // Pass teams to get team info for PlayerCards
            matches={matches} // Pass matches for player stats
            events={events} // Pass events for player stats
            allSports={allSports.map(s => s.name as Sport)} // Here, we still need Sport[] for player detail logic (e.g., in calculatePlayerOverallStats)
            sportEventTypesMap={SPORT_EVENT_TYPES_MAP}
            sportScoreTermMap={SPORT_SCORE_TERM_MAP}
            primaryScoringEventTypesMap={PRIMARY_SCORING_EVENT_TYPES_MAP}
            activePlayerId={activePlayerId} // Pass activePlayerId
            onNavigate={handleNavigate} // Pass onNavigate for deeper navigation to team details
          />
        )}
        {currentPage === 'registerTeamsPlayers' && (
          <RegisterTeamsPlayers
            fetchData={fetchData} // Allow to trigger re-fetch after upload
            allSchools={allSchools}
            allSports={allSports}
            allCategories={allCategories}
            gendersList={GENDERS_LIST}
          />
        )}
        {currentPage === 'generateSchedule' && (
          <GenerateSchedule
            fetchData={fetchData} // Allow to trigger re-fetch after schedule generation
            onNavigate={handleNavigate}
          />
        )}

      </React.Fragment>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      <header style={{
          background: 'var(--gradient-header)',
          padding: '20px 40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          position: 'relative' // Needed for absolute positioning of user info
      }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              {/* Logo y título */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                  <div style={{
                      background: 'white',
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '30px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                  }}>🏆</div>
                  <h1 style={{
                      color: 'white',
                      fontSize: '36px',
                      fontWeight: '900',
                      margin: '0',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                  }}>DATA SPORT</h1>
              </div>
              
              {/* Navegación con tabs modernos */}
              <nav style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['dashboard', 'calendar', 'liveScoring', 'results', 'statistics', 'standings', 'teams', 'schools', 'players', 'registerTeamsPlayers', 'generateSchedule'].map(page => {
                      const labels: Record<string, string> = {
                        dashboard: 'Inicio',
                        calendar: 'Calendario',
                        liveScoring: 'En Vivo',
                        results: 'Resultados',
                        statistics: 'Estadísticas',
                        standings: 'Tablas',
                        teams: 'Equipos',
                        schools: 'Colegios',
                        players: 'Jugadores',
                        registerTeamsPlayers: 'Registrar',
                        generateSchedule: 'Programar'
                      };
                      return (
                      <button
                          key={page}
                          onClick={() => handleNavigate(page as Page)}
                          className={`nav-tab ${currentPage === page ? 'active' : ''}`}
                      >
                          {labels[page] || page} 
                      </button>
                      );
                  })}
              </nav>
              
              {/* Usuario en la esquina superior derecha */}
              <div style={{ position: 'absolute', top: '20px', right: '40px' }}>
                  <span style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '25px',
                      backdropFilter: 'blur(10px)'
                  }}>
                      👤 {currentUser?.email || 'editor@example.com'}
                  </span>
              </div>
          </div>
      </header>
      <main className="flex-grow" style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
