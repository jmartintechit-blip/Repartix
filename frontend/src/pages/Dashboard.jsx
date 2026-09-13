import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import FormularioCrearGrupo from '../components/grupos/FormularioCrearGrupo.jsx';
import FormularioUnirseGrupo from '../components/grupos/FormularioUnirseGrupo.jsx';
import { listarGrupos } from '../api/grupos.js';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { usuario, token } = useAuth();
  const navigate = useNavigate();

  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(null); // 'crear' | 'unirse' | null

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const { grupos } = await listarGrupos(token);
        if (!cancelado) setGrupos(grupos);
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [token]);

  function irAGrupo(grupo) {
    navigate(`/grupos/${grupo.id}`);
  }

  return (
    <AppShell>
      <div className={styles.encabezado}>
        <h1>Hola, {usuario?.nombre}</h1>
        <div className={styles.acciones}>
          <Button variant="ghost" onClick={() => setModalAbierto('unirse')}>
            Unirse a grupo
          </Button>
          <Button onClick={() => setModalAbierto('crear')}>Crear grupo</Button>
        </div>
      </div>

      {cargando && <p className={styles.mensaje}>Cargando tus grupos...</p>}
      {!cargando && error && <p className={styles.mensajeError}>{error}</p>}

      {!cargando && !error && grupos.length === 0 && (
        <Card className={styles.vacio}>
          <p>Aun no tienes grupos. Crea uno o unete con un codigo de invitacion.</p>
        </Card>
      )}

      {!cargando && grupos.length > 0 && (
        <div className={styles.lista}>
          {grupos.map((grupo) => (
            <Card
              key={grupo.id}
              className={styles.tarjeta}
              onClick={() => irAGrupo(grupo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && irAGrupo(grupo)}
            >
              <h3>{grupo.nombre}</h3>
              <p className={styles.codigo}>{grupo.codigo_invitacion}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalAbierto === 'crear'} onClose={() => setModalAbierto(null)} title="Crear grupo">
        <FormularioCrearGrupo
          onCreado={(grupo) => {
            setModalAbierto(null);
            navigate(`/grupos/${grupo.id}`);
          }}
        />
      </Modal>

      <Modal open={modalAbierto === 'unirse'} onClose={() => setModalAbierto(null)} title="Unirse a un grupo">
        <FormularioUnirseGrupo
          onUnido={(grupo) => {
            setModalAbierto(null);
            navigate(`/grupos/${grupo.id}`);
          }}
        />
      </Modal>
    </AppShell>
  );
}
