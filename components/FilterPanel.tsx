
import React, { useMemo, useCallback } from 'react';
import { Sport, Category, Gender, FilterOptions, SchoolData, SportData, CategoryData } from '../types';
import Dropdown from './Dropdown';
// Removed import from constants.ts

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (newFilters: FilterOptions) => void;
  showDateFilter?: boolean;
  showSchoolFilter?: boolean;
  clearFilters?: () => void;
  // New props for dynamic lists
  allSchools: SchoolData[];
  allSports: SportData[]; // Changed from SportData[] to Sport[]
  allCategories: CategoryData[];
  gendersList: Gender[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFilterChange,
  showDateFilter = false,
  showSchoolFilter = false,
  clearFilters,
  allSchools,
  allSports, // This is now SportData[]
  allCategories,
  gendersList,
}) => {
  const handleSportChange = (value: string) => {
    const selectedSportName = value === 'all' ? 'all' : (value as Sport);
    let newCategoryName: Category | 'all' = 'all';

    // If a sport is selected, filter categories that belong to that sport
    if (selectedSportName !== 'all') {
      // Find the ID of the selected sport based on its name. This requires the full SportData list.
      // FilterPanel does not have SportData[] directly, it has Sport[] (names).
      // So, if we need sport_id for category filtering, FilterPanel needs the original SportData[].
      // This is the core problem.

      // Let's assume for `handleSportChange` that if a sport name is selected,
      // `getFilteredCategoriesOptions` will handle the actual filtering based on `filters.sport`.
      // `handleSportChange` itself only updates the `filters.sport` state.

      // The `allCategories` array contains `sport_id`.
      // When filtering categories based on `filters.sport`, we need to find the `sport_id` for that `filters.sport` name.
      // FIX: Use 'allSports' prop which is SportData[] instead of undeclared 'allSportsData'
      const selectedSportData = allSports.find(s => s.name === selectedSportName);

      if (selectedSportData) {
        const compatibleCategories = allCategories.filter(c => c.sport_id === selectedSportData.id).map(c => c.name);
        if (filters.category !== 'all' && !compatibleCategories.includes(filters.category as string)) {
          newCategoryName = 'all';
        } else {
          newCategoryName = filters.category || 'all';
        }
      } else {
        newCategoryName = 'all';
      }
    } else {
      newCategoryName = 'all';
    }


    onFilterChange({
      ...filters,
      sport: selectedSportName,
      category: newCategoryName,
    });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({ ...filters, category: value === 'all' ? 'all' : (value as Category) });
  };

  const handleGenderChange = (value: string) => {
    onFilterChange({ ...filters, gender: value === 'all' ? 'all' : (value as Gender) });
  };

  const handleSchoolChange = (value: string) => {
    onFilterChange({ ...filters, school: value === 'all' ? 'all' : value });
  };

  const handleDateChange = (value: string) => {
    onFilterChange({ ...filters, date: value });
  };

  // This `allSportsData` reference is crucial for category filtering.
  // It is NOT passed as `allSports` prop to `FilterPanel`.
  // It is passed as `allSports: Sport[]` from App.tsx.
  // The correct `SportData[]` is only available in `App.tsx` as `allSports` (the state variable).

  // To fix this, `FilterPanel` must receive `SportData[]` from `App.tsx`.
  // This will require changing `App.tsx` and all intermediary page components to pass `allSports` (the `SportData[]` state) down.
  // This is a bigger change than just fixing FilterPanel.
  // Let's make the Minimal Change:
  // Option 1: Keep `FilterPanel.allSports: Sport[]` and modify `getFilteredCategoriesOptions` to infer sport_id from `allCategories`.
  // Option 2: Change `App.tsx` to pass `allSportData: SportData[]` to FilterPanel directly. This is cleaner.

  // The request is to fix the sport dropdown in Teams.tsx.
  // The current `App.tsx` has `allSports` state as `SportData[]`.
  // It then does `allSports.map(s => s.name as Sport)` when passing to pages.
  // And pages pass this `Sport[]` to FilterPanel.

  // The `FilterPanelProps` has `allSports: Sport[]`.
  // The `sportsOptions` `useMemo` in `FilterPanel` is `allSports.map(s => ({ value: s.name, label: s.name }))`.
  // This is the bug: if `s` is already a string (`Sport` enum value), `s.name` is undefined.

  // FIX: Revert sportsOptions to use 's.name' because 'allSports' is SportData[] as per FilterPanelProps
  const sportsOptions = useMemo(() => ([
    { value: 'all', label: 'Todos los Deportes' },
    ...allSports.map(s => ({ value: s.name, label: s.name }))
  ]), [allSports]);

  // FIX 2: Correct `getFilteredCategoriesOptions` to work with `allSports` as `Sport[]`.
  // This means if `filters.sport` is selected, we need to find its ID from somewhere.
  // We can derive `sport_id` from `allCategories` itself by looking up categories whose `name` match the `filters.sport`.
  const getFilteredCategoriesOptions = useMemo(() => {
    let categoriesToProcess = allCategories;
    
    // Apply sport filter
    if (filters.sport && filters.sport !== 'all') {
      // To filter categories by sport, we need the sport's ID.
      // `allSports` here is `Sport[]` (array of names).
      // `allCategories` has `sport_id`.
      // We need `allSportData` (which is `SportData[]`) to link `Sport` name to `sport_id`.
      // This means `FilterPanel` must receive `SportData[]` directly.

      // Okay, let's implement the *correct* way: `FilterPanel` receives `SportData[]` for `allSports`.
      // This will involve changing `App.tsx` to pass `allSports` (its state `SportData[]`) to pages.
      // And then pages pass that `SportData[]` to `FilterPanel`.

      // Let's revert `allSports` in `FilterPanelProps` back to `SportData[]`.
      // And then ensure `App.tsx` and intermediate components pass the `SportData[]` object.
      // This is the cleanest solution for robust filtering.
      // I will update `App.tsx` and all pages to pass `allSports` (the `SportData[]` state)
      // to `FilterPanel` components.

      // This means `allSports` will be `SportData[]` in FilterPanelProps.
      // So `s.id` and `s.name` will be available.
      const selectedSportData = allSports.find(s => s.name === filters.sport); // Casting back assuming we get SportData[]
      if (selectedSportData) {
        categoriesToProcess = categoriesToProcess.filter(c => c.sport_id === selectedSportData.id);
      }
    }
    
    // Apply gender filter
    if (filters.gender && filters.gender !== 'all') {
      categoriesToProcess = categoriesToProcess.filter(c => c.gender === filters.gender);
    }

    // Now, ensure unique category names for the dropdown options
    const uniqueCategoryNames = new Set<string>();
    const options: { value: string; label: string }[] = [];

    categoriesToProcess.forEach(c => {
      if (!uniqueCategoryNames.has(c.name)) {
        uniqueCategoryNames.add(c.name);
        options.push({ value: c.name, label: c.name });
      }
    });

    return [
      { value: 'all', label: 'Todas las Categorías' },
      ...options
    ];
  }, [allCategories, allSports, filters.sport, filters.gender]); // allSports is now SportData[]


  const gendersOptions = useMemo(() => ([
    { value: 'all', label: 'Todos los Géneros' },
    ...gendersList.map(g => ({ value: g, label: g }))
  ]), [gendersList]);

  const schoolsOptions = useMemo(() => ([
    { value: 'all', label: 'Todos los Colegios' },
    ...allSchools.map(s => ({ value: s.name, label: s.name }))
  ]), [allSchools]);


  return (
    <div className="card p-4 rounded-lg shadow-md mb-6 flex flex-wrap items-center gap-4">
      <Dropdown
        options={sportsOptions}
        value={filters.sport || 'all'}
        onChange={handleSportChange}
        placeholder="Deporte"
        className="flex-grow md:flex-grow-0"
      />
      <Dropdown
        options={getFilteredCategoriesOptions}
        value={filters.category || 'all'}
        onChange={handleCategoryChange}
        placeholder="Categoría"
        className="flex-grow md:flex-grow-0"
        // Disabled if no sport selected or no categories available for selected sport/gender
        disabled={getFilteredCategoriesOptions.length <= 1} 
      />
      <Dropdown
        options={gendersOptions}
        value={filters.gender || 'all'}
        onChange={handleGenderChange}
        placeholder="Género"
        className="flex-grow md:flex-grow-0"
      />
      {showSchoolFilter && (
        <Dropdown
          options={schoolsOptions}
          value={filters.school || 'all'}
          onChange={handleSchoolChange}
          placeholder="Colegio"
          className="flex-grow md:flex-grow-0"
        />
      )}
      {showDateFilter && (
        <input
          type="date"
          value={filters.date || ''}
          onChange={(e) => handleDateChange(e.target.value)}
          className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 flex-grow md:flex-grow-0"
        />
      )}
      {clearFilters && (
        <button
          onClick={clearFilters}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Limpiar Filtros
        </button>
      )}
    </div>
  );
};

export default FilterPanel;
