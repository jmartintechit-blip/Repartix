import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import RutaProtegida from './components/routing/RutaProtegida.jsx';
import RutaInvitado from './components/routing/RutaInvitado.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <RutaInvitado>
                <Login />
              </RutaInvitado>
            }
          />
          <Route
            path="/registro"
            element={
              <RutaInvitado>
                <Registro />
              </RutaInvitado>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RutaProtegida>
                <Dashboard />
              </RutaProtegida>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
