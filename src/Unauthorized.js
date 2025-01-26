import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-100 text-center">
      <h1 className="mb-4 text-4xl font-bold text-red-500">Acesso Negado</h1>
      <p className="mb-6 text-lg text-gray-600">
        Você não tem permissão para acessar esta página.
      </p>
      <button
        onClick={() => navigate('/login')}
        className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Voltar ao Login
      </button>
    </div>
  );
};

export default Unauthorized;
