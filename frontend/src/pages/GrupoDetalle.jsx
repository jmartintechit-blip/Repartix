import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import Card from '../components/ui/Card.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { obtenerGrupo } from '../api/grupos.js';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './GrupoDetalle.module.css';

export default function GrupoDetalle() {
  const { id } = useParams();
  const { token } = useAuth();

  const [grupo, setGrupo] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    obtenerGrupo(token, id)
      .then((datos) => {
        if (cancelado) return;
        setGrupo(datos.grupo);
        setMiembros(datos.miembros);
      })
      .catch((err) => {
        if (!cancelado) setError(err.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, id]);

  function copiarCodigo() {
    navigator.clipboard
      .writeText(grupo.codigo_invitacion)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => {
        // Portapapeles bloqueado por el navegador (permisos, contexto no seguro, etc.):
        // el codigo sigue visible en pantalla, no hace falta romper la interaccion.
      });
  }

  if (cargando) {
    return (
      <AppShell>
        <p className={styles.mensaje}>Cargando grupo...</p>
      </AppShell>
    );
  }

  if (error || !grupo) {
    return (
      <AppShell>
        <Card>
          <p className={styles.mensajeError}>{error || 'Grupo no encontrado'}</p>
          <Link to="/dashboard" className={styles.volver}>
            ← Volver a mis grupos
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link to="/dashboard" className={styles.volver}>
        ← Mis grupos
      </Link>

      <div className={styles.encabezado}>
        <h1>{grupo.nombre}</h1>
        <button type="button" className={styles.codigo} onClick={copiarCodigo}>
          Codigo: <span className={styles.codigoValor}>{grupo.codigo_invitacion}</span>
          <span className={styles.copiar}>{copiado ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>

      <section className={styles.seccion}>
        <h2 className={styles.subtitulo}>Miembros ({miembros.length})</h2>
        <div className={styles.miembros}>
          {miembros.map((miembro) => (
            <div key={miembro.id} className={styles.miembro}>
              <Avatar nombre={miembro.nombre} size={28} />
              <span>{miembro.nombre}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.subtitulo}>Gastos</h2>
        <Card>
          <p>Aqui apareceran los gastos del grupo (se completa en la Fase 9).</p>
        </Card>
      </section>
    </AppShell>
  );
}
