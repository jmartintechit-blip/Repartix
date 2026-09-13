import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { obtenerGasto, eliminarGasto, asignarItem, dividirPartesIguales } from '../api/gastos.js';
import { obtenerGrupo } from '../api/grupos.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatearMoneda, formatearFecha } from '../utils/formato.js';
import styles from './GastoDetalle.module.css';

export default function GastoDetalle() {
  const { id: grupoId, gastoId } = useParams();
  const { token, usuario } = useAuth();
  const navigate = useNavigate();

  const [gasto, setGasto] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actualizando, setActualizando] = useState(false);

  const cargar = useCallback(
    () =>
      Promise.all([obtenerGasto(token, grupoId, gastoId), obtenerGrupo(token, grupoId)]).then(
        ([datosGasto, datosGrupo]) => {
          setGasto(datosGasto.gasto);
          setMiembros(datosGrupo.miembros);
        }
      ),
    [token, grupoId, gastoId]
  );

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    cargar()
      .catch((err) => {
        if (!cancelado) setError(err.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [cargar]);

  async function alternarAsignacion(item, miembroId) {
    const yaAsignado = item.asignados.some((a) => a.id === miembroId);
    const nuevosIds = yaAsignado
      ? item.asignados.filter((a) => a.id !== miembroId).map((a) => a.id)
      : [...item.asignados.map((a) => a.id), miembroId];

    setActualizando(true);
    setError('');
    try {
      await asignarItem(token, grupoId, gastoId, item.id, nuevosIds);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizando(false);
    }
  }

  async function handleDividirPartesIguales() {
    setActualizando(true);
    setError('');
    try {
      await dividirPartesIguales(token, grupoId, gastoId);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizando(false);
    }
  }

  async function handleEliminar() {
    if (!window.confirm('¿Seguro que quieres eliminar este gasto? No se puede deshacer.')) return;
    try {
      await eliminarGasto(token, grupoId, gastoId);
      navigate(`/grupos/${grupoId}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) {
    return (
      <AppShell>
        <p className={styles.mensaje}>Cargando gasto...</p>
      </AppShell>
    );
  }

  if (!gasto) {
    return (
      <AppShell>
        <Card>
          <p className={styles.mensajeError}>{error || 'Gasto no encontrado'}</p>
          <Link to={`/grupos/${grupoId}`}>← Volver al grupo</Link>
        </Card>
      </AppShell>
    );
  }

  const esPagador = gasto.pagado_por === usuario.id;
  const pagador = miembros.find((m) => m.id === gasto.pagado_por);

  return (
    <AppShell>
      <Link to={`/grupos/${grupoId}`} className={styles.volver}>
        ← Volver al grupo
      </Link>

      <div className={styles.encabezado}>
        <div>
          <h1>{gasto.descripcion}</h1>
          <p className={styles.meta}>
            {formatearMoneda(gasto.monto_total)} · Pagado por {pagador?.nombre ?? '—'} · {formatearFecha(gasto.fecha)}
          </p>
        </div>
        {esPagador && (
          <Button variant="danger" onClick={handleEliminar}>
            Eliminar gasto
          </Button>
        )}
      </div>

      {error && <p className={styles.mensajeError}>{error}</p>}

      <div className={styles.accionesItems}>
        <Button variant="ghost" onClick={handleDividirPartesIguales} disabled={actualizando}>
          Dividir en partes iguales entre todos
        </Button>
      </div>

      <div className={styles.items}>
        {gasto.items.map((item) => (
          <Card key={item.id} className={styles.item}>
            <div className={styles.itemEncabezado}>
              <span className={styles.itemNombre}>{item.nombre_item}</span>
              <span className={styles.itemPrecio}>{formatearMoneda(item.precio)}</span>
            </div>
            <div className={styles.chips}>
              {miembros.map((miembro) => {
                const seleccionado = item.asignados.some((a) => a.id === miembro.id);
                return (
                  <button
                    key={miembro.id}
                    type="button"
                    className={[styles.chip, seleccionado ? styles.chipSeleccionado : ''].join(' ')}
                    onClick={() => alternarAsignacion(item, miembro.id)}
                    disabled={actualizando}
                  >
                    <Avatar nombre={miembro.nombre} size={20} />
                    {miembro.nombre}
                  </button>
                );
              })}
            </div>
            {item.asignados.length === 0 && (
              <p className={styles.avisoSinAsignar}>Nadie ha marcado este item todavia</p>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
