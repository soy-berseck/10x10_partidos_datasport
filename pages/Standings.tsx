
import React, { useState, useMemo, useCallback } from 'react';
import { Match, Team, MatchStatus, Sport, Category, Gender, FilterOptions, TeamStats, SportData, CategoryData } from '../types';
import FilterPanel from '../components/FilterPanel';
import Dropdown from '../components/Dropdown';
import { SPORT_SCORE_TERM_MAP } from '../utils/sportConfig'; // Import from new util file

interface StandingsProps {
  teams: Team[];
  matches: Match[];
  // New props for dynamic lists
  allSports: SportData[]; // Changed to SportData[]
  allCategories: CategoryData[];
  gendersList: Gender[];
  // Sport config map
  sportScoreTermMap: typeof SPORT_SCORE_TERM_MAP;
}

const Standings: React.FC<StandingsProps> = ({ 
  teams, 
  matches,
  allSports, // Destructure as SportData[]
  allCategories,
  gendersList,
  sportScoreTermMap, // Destructure the prop
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    sport: 'all',
    category: 'all',
    gender: 'all',
  });

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      sport: 'all',
      category: 'all',
      gender: 'all',
    });
  }, []);

  const allTeamStats = useMemo(() => {
    const statsMap: { [teamId: string]: TeamStats } = {};

    teams.forEach(team => {
      statsMap[team.id] = {
        teamId: team.id,
        teamName: team.name,
        school: team.school.name,
        sport: team.sport.name,
        category: team.category.name,
        gender: team.gender,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0, 
        goalsAgainst: 0, 
        goalDifference: 0, 
        points: 0,
      };
    });

    matches.filter(m => m.status === MatchStatus.FINALIZADO).forEach(match => {
      const team1Stats = statsMap[match.team1_id];
      const team2Stats = statsMap[match.team2_id];

      if (!team1Stats || !team2Stats) return;

      // Only calculate stats for teams that match the current filters
      const team1MatchesFilters = (filters.sport === 'all' || match.sport === filters.sport) &&
                                 (filters.category === 'all' || match.category === filters.category) &&
                                 (filters.gender === 'all' || match.gender === filters.gender);
      const team2MatchesFilters = (filters.sport === 'all' || match.sport === filters.sport) &&
                                 (filters.category === 'all' || match.category === filters.category) &&
                                 (filters.gender === 'all' || match.gender === filters.gender);
      
      // If a team does not match the filters, it shouldn't contribute to the overall standings
      // This logic must be applied carefully if filters are intended to filter the *display* vs. *calculation*
      // For standings, it usually filters calculation.
      if (!team1MatchesFilters && !team2MatchesFilters) return;


      if (team1MatchesFilters) {
        team1Stats.matchesPlayed++;
        team1Stats.goalsFor += match.team1_score;
        team1Stats.goalsAgainst += match.team2_score;
      }
      if (team2MatchesFilters) {
        team2Stats.matchesPlayed++;
        team2Stats.goalsFor += match.team2_score;
        team2Stats.goalsAgainst += match.team1_score;
      }

      if (match.team1_score > match.team2_score) {
        if (team1MatchesFilters) { team1Stats.wins++; team1Stats.points += 3; }
        if (team2MatchesFilters) { team2Stats.losses++; }
      } else if (match.team1_score < match.team2_score) {
        if (team2MatchesFilters) { team2Stats.wins++; team2Stats.points += 3; }
        if (team1MatchesFilters) { team1Stats.losses++; }
      } else {
        if (team1MatchesFilters) { team1Stats.draws++; team1Stats.points += 1; }
        if (team2MatchesFilters) { team2Stats.draws++; team2Stats.points += 1; }
      }

      if (team1MatchesFilters) team1Stats.goalDifference = team1Stats.goalsFor - team1Stats.goalsAgainst;
      if (team2MatchesFilters) team2Stats.goalDifference = team2Stats.goalsFor - team2Stats.goalsAgainst;
    });

    return Object.values(statsMap);
  }, [teams, matches, filters]);


  const filteredAndSortedStandings = useMemo(() => {
    return allTeamStats
      .filter(stats => {
        // These filters are applied here to determine *which teams appear in the list*,
        // not to recalculate stats (that's done in allTeamStats above).
        if (filters.sport !== 'all' && stats.sport !== filters.sport) return false;
        if (filters.category !== 'all' && stats.category !== filters.category) return false;
        if (filters.gender !== 'all' && stats.gender !== filters.gender) return false;
        // Only show teams that have actually played matches in the filtered context
        if (stats.matchesPlayed === 0) return false;
        return true;
      })
      .sort((a, b) => {
        // Primary sort: Points (descending)
        if (b.points !== a.points) return b.points - a.points;
        // Secondary sort: Goal Difference (descending)
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        // Tertiary sort: Goals For (descending)
        return b.goalsFor - a.goalsFor;
      });
  }, [allTeamStats, filters]);

  const areFiltersSelected = useMemo(() => {
    return (filters.sport !== 'all' && filters.sport !== undefined) &&
           (filters.category !== 'all' && filters.category !== undefined) &&
           (filters.gender !== 'all' && filters.gender !== undefined);
  }, [filters]);

  const currentSportTerm = (filters.sport && filters.sport !== 'all') ? sportScoreTermMap[filters.sport as Sport] : 'Goles'; // Use prop here
  const scoreForHeader = (currentSportTerm === 'Goles' || currentSportTerm === 'Carreras') ? 'GF' : 'PF';
  const scoreAgainstHeader = (currentSportTerm === 'Goles' || currentSportTerm === 'Carreras') ? 'GC' : 'PC';


  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Tabla de Posiciones</h1>

      <FilterPanel 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        clearFilters={clearFilters} 
        allSchools={[]} // Not used in standings, but required by FilterPanel
        allSports={allSports} // Pass SportData[] directly
        allCategories={allCategories}
        gendersList={gendersList}
      />

      {!areFiltersSelected && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md mb-6" role="alert" aria-live="polite">
          <p className="font-semibold">Por favor, selecciona Deporte, Categoría y Género para ver la tabla de posiciones.</p>
        </div>
      )}

      {areFiltersSelected && filteredAndSortedStandings.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" aria-label="Tabla de Posiciones">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Pos
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Equipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  PJ
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  PG
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  PE
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  PP
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {scoreForHeader}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {scoreAgainstHeader}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  DIF
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  PTS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedStandings.map((teamStats, index) => (
                <tr key={teamStats.teamId} className={`${index < 3 ? 'bg-yellow-50 font-bold' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index === 0 && <span aria-label="Primer lugar">🥇</span>}
                    {index === 1 && <span aria-label="Segundo lugar">🥈</span>}
                    {index === 2 && <span aria-label="Tercer lugar">🥉</span>}
                    {index >= 3 && index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-semibold">{teamStats.teamName}</div>
                    <div className="text-gray-500">{teamStats.school}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{teamStats.matchesPlayed}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{teamStats.wins}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{teamStats.draws}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{teamStats.losses}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">{teamStats.goalsFor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{teamStats.goalsAgainst}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{teamStats.goalDifference}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-lg text-indigo-700 font-extrabold">{teamStats.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        areFiltersSelected && <p className="text-center text-gray-600">No hay equipos para los filtros seleccionados en esta combinación de Deporte, Categoría y Género.</p>
      )}
    </div>
  );
};

export default Standings;