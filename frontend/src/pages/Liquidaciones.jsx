import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import {
  obtenerBalances,
  calcularLiquidaciones,
  listarLiquidaciones,
  marcarLiquidacionPagada,
} from '../api/liquidaciones.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatearMoneda } from '../utils/formato.js';
import styles from './Liquidaciones.module.css';

export default function Liquidaciones() {
  const { id: grupoId } = useParams();
  const { token, usuario } = useAuth();

  const [balances, setBalances] = useState(null);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [itemsSinAsignar, setItemsSinAsignar] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [actualizando, setActualizando] = useState(null);

  const cargar = useCallback(async () => {
    setError('');
    setItemsSinAsignar(null);
    try {
      const [datosBalances, datosLiquidaciones] = await Promise.all([
        obtenerBalances(token, grupoId),
        listarLiquidaciones(token, grupoId),
      ]);
      setBalances(datosBalances.balances);
      setLiquidaciones(datosLiquidaciones.liquidaciones);
    } catch (err) {
      if (err.data?.items_sin_asignar) {
        setItemsSinAsignar(err.data.items_sin_asignar);
      } else {
        setError(err.message);
      }
    }
  }, [token, grupoId]);

  useEffect(() => {
    setCargando(true);
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  async function handleCalcular() {
    setCalculando(true);
    setError('');
    setItemsSinAsignar(null);
    try {
      const { liquidaciones } = await calcularLiquidaciones(token, grupoId);
      setLiquidaciones(liquidaciones);
    } catch (err) {
      if (err.data?.items_sin_asignar) {
        setItemsSinAsignar(err.data.items_sin_asignar);
      } else {
        setError(err.message);
      }
    } finally {
      setCalculando(false);
    }
  }

  async function handleMarcarPagada(liquidacionId) {
    setActualizando(liquidacionId);
    setError('');
    try {
      await marcarLiquidacionPagada(token, grupoId, liquidacionId);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizando(null);
    }
  }

  if (cargando) {
    return (
      <AppShell>
        <p className={styles.mensaje}>Cargando balances...</p>
      </AppShell>
    );
  }

  const pendientes = liquidaciones.filter((l) => l.estado === 'pendiente');
  const pagadas = liquidaciones.filter((l) => l.estado === 'pagado');

  return (
    <AppShell>
      <Link to={`/grupos/${grupoId}`} className={styles.volver}>
        ← Volver al grupo
      </Link>
      <h1>Balances y liquidaciones</h1>

      {error && <p className={styles.mensajeError}>{error}</p>}

      {itemsSinAsignar && (
        <Card className={styles.avisoCard}>
          <p className={styles.avisoTitulo}>
            Hay {itemsSinAsignar.length} item{itemsSinAsignar.length > 1 ? 's' : ''} sin asignar a nadie todavia.
          </p>
          <p>Asignalos para poder calcular quien debe a quien:</p>
          <ul className={styles.listaAvisos}>
            {itemsSinAsignar.map((item) => (
              <li key={item.item_id}>
                <Link to={`/grupos/${grupoId}/gastos/${item.gasto_id}`}>
                  {item.descripcion} — {item.nombre_item}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!itemsSinAsignar && balances && (
        <>
          <section className={styles.seccion}>
            <h2 className={styles.subtitulo}>Balance de cada miembro</h2>
            <div className={styles.balances}>
              {balances.map((b) => (
                <Card key={b.usuario_id} className={styles.balanceCard}>
                  <span>{b.nombre}</span>
                  <span
                    className={[
                      styles.balanceImporte,
                      b.balance > 0 ? styles.positivo : b.balance < 0 ? styles.negativo : styles.neutro,
                    ].join(' ')}
                  >
                    {b.balance === 0
                      ? 'Al dia'
                      : b.balance > 0
                        ? `Le deben ${formatearMoneda(b.balance)}`
                        : `Debe ${formatearMoneda(-b.balance)}`}
                  </span>
                </Card>
              ))}
            </div>
          </section>

          <section className={styles.seccion}>
            <div className={styles.liquidacionesEncabezado}>
              <h2 className={styles.subtitulo}>Liquidaciones</h2>
              <Button onClick={handleCalcular} loading={calculando} variant="ghost">
                Recalcular
              </Button>
            </div>

            {pendientes.length === 0 && pagadas.length === 0 && (
              <Card>
                <p>Todavia no se ha calculado el reparto. Pulsa "Recalcular" para generarlo.</p>
              </Card>
            )}

            {pendientes.length > 0 && (
              <div className={styles.listaLiquidaciones}>
                {pendientes.map((l) => (
                  <Card key={l.id} className={styles.liquidacionCard}>
                    <div>
                      <p className={styles.liquidacionTexto}>
                        <strong>{l.de_nombre}</strong> debe a <strong>{l.a_nombre}</strong>
                      </p>
                      <p className={styles.liquidacionImporte}>{formatearMoneda(l.monto)}</p>
                    </div>
                    {(l.de_usuario_id === usuario.id || l.a_usuario_id === usuario.id) && (
                      <Button
                        variant="secondary"
                        onClick={() => handleMarcarPagada(l.id)}
                        loading={actualizando === l.id}
                      >
                        Marcar como pagada
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {pagadas.length > 0 && (
              <>
                <h3 className={styles.historialTitulo}>Historial</h3>
                <div className={styles.listaLiquidaciones}>
                  {pagadas.map((l) => (
                    <Card key={l.id} className={styles.liquidacionCardPagada}>
                      <div>
                        <p className={styles.liquidacionTexto}>
                          <strong>{l.de_nombre}</strong> pago a <strong>{l.a_nombre}</strong>
                        </p>
                        <p className={styles.liquidacionImporte}>{formatearMoneda(l.monto)}</p>
                      </div>
                      <Badge tone="success">Pagado</Badge>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
