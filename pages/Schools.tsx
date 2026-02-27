
import React, { useState, useMemo, useCallback } from 'react';
import { SchoolData, Team, Player } from '../types';
import Button from '../components/Button';
import SchoolCard from '../components/SchoolCard'; // Import the new SchoolCard

type Page = 'dashboard' | 'calendar' | 'liveScoring' | 'results' | 'statistics' | 'standings' | 'teams' | 'schools' | 'players';
interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean;
  matchId?: string; // Added for liveScoring to jump to specific match
}

interface SchoolsProps {
  allSchools: SchoolData[];
  teams: Team[]; // Necesario para mostrar equipos de un colegio
  activeSchoolId: string | null; // New prop to show specific school details
  onNavigate: (page: Page, options?: NavigateOptions) => void; // For navigating to team details
}

// Helper to generate a consistent color for the school icon based on its name
// NOTE: Moved to SchoolCard.tsx and TeamCard.tsx for encapsulation
const getColorForSchool = (schoolName: string) => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  const hash = schoolName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};


const Schools: React.FC<SchoolsProps> = ({ allSchools, teams, activeSchoolId, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSchools = useMemo(() => {
    if (!searchTerm) {
      return allSchools.sort((a, b) => a.name.localeCompare(b.name));
    }
    return allSchools
      .filter(school => school.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allSchools, searchTerm]);

  const selectedSchool = useMemo(() => {
    return activeSchoolId ? allSchools.find(school => school.id === activeSchoolId) : null;
  }, [activeSchoolId, allSchools]);

  const schoolTeams = useMemo(() => {
    return selectedSchool ? teams.filter(team => team.school.id === selectedSchool.id) : [];
  }, [selectedSchool, teams]);

  // Handler for viewing school details (sets activeSchoolId in App.tsx via onNavigate)
  const handleViewSchoolDetails = useCallback((schoolId: string) => {
    onNavigate('schools', { schoolId });
  }, [onNavigate]);

  // Handler for navigating back to all schools
  const handleBackToAllSchools = useCallback(() => {
    onNavigate('schools'); // Navigate to schools page without an ID
  }, [onNavigate]);

  // Handler for navigating to team details
  const handleViewTeamDetails = useCallback((teamId: string) => {
    onNavigate('teams', { teamId });
  }, [onNavigate]);


  if (selectedSchool) {
    // const initial = selectedSchool.name.charAt(0).toUpperCase(); // Removed, handled by SchoolCard
    // const bgColor = getColorForSchool(selectedSchool.name); // Removed, handled by SchoolCard

    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={handleBackToAllSchools} variant="secondary" aria-label="Volver a todos los colegios">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 10011.414 0z" clipRule="evenodd" />
            </svg>
            Volver a Colegios
          </Button>
          <h1 className="text-3xl font-extrabold text-gray-800">Detalles del Colegio</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {selectedSchool.logo_url ? (
              <img 
                src={selectedSchool.logo_url} 
                alt={`Logo de ${selectedSchool.name}`} 
                className="w-24 h-24 rounded-full object-cover flex-shrink-0" 
                onError={(e) => { e.currentTarget.src = `https://via.placeholder.com/96/cccccc/ffffff?text=${selectedSchool.name.charAt(0).toUpperCase()}`; }}
              />
            ) : (
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold ${getColorForSchool(selectedSchool.name)} flex-shrink-0`}>
                {selectedSchool.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-1">{selectedSchool.name}</h2>
              <div className="mt-3 text-base text-gray-600 space-y-1">
                <p>Equipos Registrados: <span className="font-medium text-gray-800">{schoolTeams.length}</span></p>
                {/* Puedes añadir más detalles del colegio aquí si están disponibles en SchoolData */}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Equipos del Colegio ({schoolTeams.length})</h3>
          {schoolTeams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {schoolTeams.map(team => (
                <div 
                  key={team.id} 
                  className="bg-gray-50 p-3 rounded-md shadow-sm flex flex-col items-center text-center cursor-pointer 
                             hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => handleViewTeamDetails(team.id)}
                  aria-label={`Ver detalles del equipo ${team.name}`}
                >
                  <p className="font-semibold text-gray-800">{team.name}</p>
                  <p className="text-sm text-gray-600">{team.sport.name} - {team.category.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Este colegio no tiene equipos registrados.</p>
          )}
        </div>
      </div>
    );
  }

  // Default view: List of all schools
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Colegios Participantes</h1>

      <div className="mb-6 card p-4 rounded-lg shadow-md">
        <input
          type="text"
          placeholder="Buscar colegio por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
          aria-label="Buscar colegio"
        />
      </div>

      {filteredSchools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredSchools.map(school => (
            <SchoolCard key={school.id} school={school} onViewDetails={handleViewSchoolDetails} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600 text-lg py-10">No se encontraron colegios que coincidan con la búsqueda.</p>
      )}
    </div>
  );
};

export default Schools;
