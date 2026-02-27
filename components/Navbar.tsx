
import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Button from './Button';
import { Page } from '../types'; // Import Page type from types.ts

interface NavigateOptions {
  teamId?: string;
  schoolId?: string;
  playerTab?: boolean; // For statistics page to jump to player tab
  matchId?: string; // For liveScoring to jump to specific match
}

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page, options?: NavigateOptions) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { currentUser, logout } = useContext(AuthContext);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const readerNavItems = [
    { name: 'Inicio', page: 'dashboard' },
    { name: 'Equipos', page: 'teams' },
    { name: 'Jugadores', page: 'players' },
    { name: 'Partidos', page: 'calendar' },
    { name: 'Estadísticas', page: 'statistics' },
    { name: 'Tablas', page: 'standings' },
  ];

  const editorNavItems = [
    ...readerNavItems,
    { name: 'Gestión de Partidos', page: 'liveScoring' },
    { name: 'Generar Programación', page: 'generateSchedule' },
    { name: 'Importar Excel', page: 'importExcel' },
  ];

  const navItems = currentUser?.role === 'editor' ? editorNavItems : readerNavItems;

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  return (
    <nav className="bg-gray-800 text-white shadow-lg p-4 sticky top-0 z-40">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <div className="text-2xl font-bold text-white mb-2 md:mb-0">
          Big Games 2026
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-wrap gap-2 text-sm md:text-base">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page as Page)}
                className={`
                  px-3 py-2 rounded-md transition-colors duration-200
                  ${currentPage === item.page
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">{currentUser?.username || 'Usuario'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <div className="block px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
                  Rol: {currentUser?.role === 'editor' ? 'Editor' : 'Espectador'}
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;