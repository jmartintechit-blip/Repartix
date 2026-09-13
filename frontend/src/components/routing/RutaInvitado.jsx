import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import PantallaCarga from './PantallaCarga.jsx';

export default function RutaInvitado({ children }) {
  const { autenticado, cargando } = useAuth();

  if (cargando) return <PantallaCarga />;
  if (autenticado) return <Navigate to="/dashboard" replace />;
  return children;
}
