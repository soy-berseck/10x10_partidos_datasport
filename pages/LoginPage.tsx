
import React, { useState, useContext } from 'react';
import Button from '../components/Button';
import { AuthContext } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Password is not actually validated in the mock AuthContext, but input is still required.
    const success = await login(username, password);
    if (!success) {
      setError('Credenciales inválidas. Por favor, inténtalo de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-gray-800 text-center mb-6">Iniciar Sesión en Big Games 2026</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
            <input
              type="email"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Email de usuario"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Contraseña"
            />
          </div>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <Button type="submit" variant="primary" className="w-full py-3 text-lg">
            Iniciar Sesión
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Credenciales de prueba (para mock de autenticación):</p>
          <p><span className="font-semibold">Espectador:</span> viewer@example.com / cualquier</p>
          <p><span className="font-semibold">Editor:</span> editor@example.com / cualquier</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
