import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import PantallaCarga from './PantallaCarga.jsx';

export default function RutaProtegida({ children }) {
  const { autenticado, cargando } = useAuth();
  const { pathname } = useLocation();

  if (cargando) return <PantallaCarga />;
  if (!autenticado) return <Navigate to="/" replace state={{ from: pathname }} />;
  return children;
}
