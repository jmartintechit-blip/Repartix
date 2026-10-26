import { Fragment } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import RutaProtegida from './components/routing/RutaProtegida.jsx';
import RutaInvitado from './components/routing/RutaInvitado.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GrupoDetalle from './pages/GrupoDetalle.jsx';
import GastoDetalle from './pages/GastoDetalle.jsx';
import Liquidaciones from './pages/Liquidaciones.jsx';

// Remonta la pagina al cambiar de grupo o gasto: asi el estado de carga vuelve a empezar
// sin tener que reiniciarlo dentro de un efecto.
function PorRuta({ children }) {
  const { pathname } = useLocation();
  return <Fragment key={pathname}>{children}</Fragment>;
}

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
          <Route
            path="/grupos/:id"
            element={
              <RutaProtegida>
                <PorRuta>
                  <GrupoDetalle />
                </PorRuta>
              </RutaProtegida>
            }
          />
          <Route
            path="/grupos/:id/gastos/:gastoId"
            element={
              <RutaProtegida>
                <PorRuta>
                  <GastoDetalle />
                </PorRuta>
              </RutaProtegida>
            }
          />
          <Route
            path="/grupos/:id/liquidaciones"
            element={
              <RutaProtegida>
                <PorRuta>
                  <Liquidaciones />
                </PorRuta>
              </RutaProtegida>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
