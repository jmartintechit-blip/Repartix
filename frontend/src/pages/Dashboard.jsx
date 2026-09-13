import AppShell from '../components/layout/AppShell.jsx';
import Card from '../components/ui/Card.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { usuario } = useAuth();

  return (
    <AppShell>
      <h1>Hola, {usuario?.nombre}</h1>
      <Card style={{ marginTop: 24 }}>
        <p>Aqui apareceran tus grupos (se completa en la Fase 8).</p>
      </Card>
    </AppShell>
  );
}
