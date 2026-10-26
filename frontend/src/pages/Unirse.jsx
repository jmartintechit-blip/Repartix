import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { unirseAGrupo } from '../api/grupos.js';
import { useAuth } from '../context/useAuth.js';
import styles from './Unirse.module.css';

// Destino de los enlaces de invitacion. Pide confirmacion en vez de unirse al abrir el enlace,
// para que una pagina ajena no pueda meter a nadie en un grupo sin que lo vea.
export default function Unirse() {
  const { codigo } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function unirse() {
    setError('');
    setEnviando(true);
    try {
      const { grupo } = await unirseAGrupo(token, { codigo_invitacion: codigo });
      navigate(`/grupos/${grupo.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <AppShell>
      <Card>
        <div className={styles.contenido}>
          <h1>Te han invitado a un grupo</h1>
          <p className={styles.codigo}>{codigo.toUpperCase()}</p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.acciones}>
            <Button onClick={unirse} loading={enviando}>
              Unirme al grupo
            </Button>
            <Link to="/dashboard" className={styles.cancelar}>
              Ahora no
            </Link>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
