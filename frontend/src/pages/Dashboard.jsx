import AppShell from '../components/layout/AppShell.jsx';
import Card from '../components/ui/Card.jsx';

export default function Dashboard() {
  return (
    <AppShell>
      <h1>Tus grupos</h1>
      <Card style={{ marginTop: 24 }}>
        <p>Aqui apareceran tus grupos (se completa en la Fase 8).</p>
      </Card>
    </AppShell>
  );
}
