
import React, { useState, useCallback, useContext, useMemo } from 'react';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';
import { Sport, Category, Gender, SchoolData, SportData, CategoryData } from '../types';

interface RegisterTeamsPlayersProps {
  fetchData: () => Promise<void>;
  allSchools: SchoolData[];
  allSports: SportData[];
  allCategories: CategoryData[];
  gendersList: Gender[];
}

const RegisterTeamsPlayers: React.FC<RegisterTeamsPlayersProps> = ({
  fetchData,
  allSchools,
  allSports,
  allCategories,
  gendersList,
}) => {
  const { currentUser } = useContext(AuthContext);
  const { showNotification } = useNotification();
  const isEditor = currentUser?.role === 'editor';

  const [formData, setFormData] = useState({
    school: '',
    sport: '',
    category: '',
    gender: '',
    full_name: '',
    birth_date: '',
    document_id: '',
    jersey_number: '',
    grade: '',
    eps: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const availableCategoriesOptions = useMemo(() => {
    if (formData.sport) {
      const selectedSportData = allSports.find(s => s.name === formData.sport);
      let filtered = allCategories.filter(c => c.sport_id === selectedSportData?.id);
      
      if (formData.gender) {
        filtered = filtered.filter(c => c.gender === formData.gender);
      }
      
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
  }, [formData.sport, formData.gender, allCategories, allSports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditor) {
      showNotification('Necesitas permisos de Editor para registrar jugadores.', 'error');
      return;
    }

    if (!formData.school || !formData.sport || !formData.category || !formData.gender || !formData.full_name) {
      showNotification('Por favor completa los campos obligatorios (Colegio, Deporte, Categoría, Género, Nombre).', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Find IDs
      const school = allSchools.find(s => s.name === formData.school);
      const sport = allSports.find(s => s.name === formData.sport);
      
      // Strict match for category including gender
      const targetCategory = allCategories.find(c => 
        c.name === formData.category && 
        c.sport_id === sport?.id &&
        c.gender === formData.gender
      );

      if (!school || !sport || !targetCategory) {
        throw new Error('Datos de referencia (Colegio, Deporte, Categoría) no encontrados. Verifica que la categoría exista para el género seleccionado.');
      }

      // 2. Check/Create Team
      // Team is defined by School + Sport + Category + Gender
      // Name convention: "School Name - Category Name Gender" or just "School Name" if we want simple.
      // Let's use a descriptive name to avoid collisions if multiple teams from same school.
      // Actually, typically teams are named by the School. But in a tournament, "Colegio A" might have "Colegio A - Futbol Infantil".
      // Let's try to find an existing team first.
      
      const { data: existingTeams, error: findTeamError } = await supabase
        .from('teams')
        .select('*')
        .eq('school_id', school.id)
        .eq('sport_id', sport.id)
        .eq('category_id', targetCategory.id)
        .eq('gender', formData.gender);

      if (findTeamError) throw findTeamError;

      let teamId = existingTeams && existingTeams.length > 0 ? existingTeams[0].id : null;

      if (!teamId) {
        // Create Team
        // Construct a name.
        // If the user didn't provide a team name, we generate one.
        // The form doesn't have "Team Name".
        const generatedTeamName = `${school.name} ${targetCategory.name} ${formData.gender}`;
        // Or maybe just the school name if it's unique enough? No, usually not.
        // Let's use the generated name.
        
        const { data: newTeam, error: createTeamError } = await supabase
          .from('teams')
          .insert({
            name: generatedTeamName, // Using generated name
            school_id: school.id,
            sport_id: sport.id,
            category_id: targetCategory.id,
            gender: formData.gender,
          })
          .select()
          .single();

        if (createTeamError) throw createTeamError;
        teamId = newTeam.id;
      }

      // 3. Create Player
      const { error: createPlayerError } = await supabase
        .from('players')
        .insert({
          full_name: formData.full_name,
          team_id: teamId,
          birth_date: formData.birth_date || null,
          document_id: formData.document_id || null,
          jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
          grade: formData.grade || null,
          eps: formData.eps || null,
        });

      if (createPlayerError) throw createPlayerError;

      showNotification('Jugador registrado exitosamente!', 'success');
      
      // Clear player specific fields, keep context fields (School, Sport, Category, Gender) for faster entry
      setFormData(prev => ({
        ...prev,
        full_name: '',
        birth_date: '',
        document_id: '',
        jersey_number: '',
        grade: '',
        eps: '',
      }));

      await fetchData();

    } catch (error: any) {
      console.error('Error registering:', error);
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Registrar Jugador y Equipo</h1>

      {!isEditor && (
        <div className="mb-6 p-4 rounded-md bg-yellow-100 border-yellow-500 text-yellow-700">
          <p>Solo los editores pueden registrar jugadores.</p>
        </div>
      )}

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Context Fields */}
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Datos del Equipo</h2>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Colegio *</label>
            <Dropdown
              options={[{ value: '', label: 'Seleccionar Colegio' }, ...allSchools.map(s => ({ value: s.name, label: s.name }))]}
              value={formData.school}
              onChange={(val) => handleInputChange('school', val)}
              placeholder="Seleccionar Colegio"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Deporte *</label>
            <Dropdown
              options={[{ value: '', label: 'Seleccionar Deporte' }, ...allSports.map(s => ({ value: s.name, label: s.name }))]}
              value={formData.sport}
              onChange={(val) => handleInputChange('sport', val)}
              placeholder="Seleccionar Deporte"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Categoría *</label>
            <Dropdown
              options={availableCategoriesOptions}
              value={formData.category}
              onChange={(val) => handleInputChange('category', val)}
              placeholder="Seleccionar Categoría"
              className="w-full"
              disabled={!formData.sport}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Género *</label>
            <Dropdown
              options={[{ value: '', label: 'Seleccionar Género' }, ...gendersList.map(g => ({ value: g, label: g }))]}
              value={formData.gender}
              onChange={(val) => handleInputChange('gender', val)}
              placeholder="Seleccionar Género"
              className="w-full"
            />
          </div>

          {/* Player Fields */}
          <div className="col-span-1 md:col-span-2 mt-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Datos del Jugador</h2>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Nombre Completo *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => handleInputChange('birth_date', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Documento de Identidad</label>
            <input
              type="text"
              value={formData.document_id}
              onChange={(e) => handleInputChange('document_id', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: 1234567890"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Número de Camiseta</label>
            <input
              type="number"
              value={formData.jersey_number}
              onChange={(e) => handleInputChange('jersey_number', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: 10"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Grado</label>
            <input
              type="text"
              value={formData.grade}
              onChange={(e) => handleInputChange('grade', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: 9no, 10mo"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">EPS</label>
            <input
              type="text"
              value={formData.eps}
              onChange={(e) => handleInputChange('eps', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: Sura, Sanitas"
            />
          </div>

          <div className="col-span-1 md:col-span-2 mt-6">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !isEditor}
              className="w-full md:w-auto"
            >
              {isSubmitting ? 'Guardando...' : 'Registrar Jugador'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default RegisterTeamsPlayers;
