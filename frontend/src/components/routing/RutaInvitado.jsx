import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import PantallaCarga from './PantallaCarga.jsx';

export default function RutaInvitado({ children }) {
  const { autenticado, cargando } = useAuth();
  const { state } = useLocation();

  if (cargando) return <PantallaCarga />;
  if (autenticado) return <Navigate to={state?.from ?? '/dashboard'} replace />;
  return children;
}
