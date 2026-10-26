import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import Card from '../components/ui/Card.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import FormularioNuevoGasto from '../components/gastos/FormularioNuevoGasto.jsx';
import Input from '../components/ui/Input.jsx';
import { obtenerGrupo, renombrarGrupo, regenerarCodigo, eliminarGrupo, quitarMiembro } from '../api/grupos.js';
import { listarGastos } from '../api/gastos.js';
import { useAuth } from '../context/useAuth.js';
import { formatearMoneda, formatearFecha } from '../utils/formato.js';
import styles from './GrupoDetalle.module.css';

export default function GrupoDetalle() {
  const { id } = useParams();
  const { token, usuario } = useAuth();
  const navigate = useNavigate();

  const [grupo, setGrupo] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  const [gastos, setGastos] = useState([]);
  const [cargandoGastos, setCargandoGastos] = useState(true);
  const [errorGastos, setErrorGastos] = useState('');
  const [modalNuevoGasto, setModalNuevoGasto] = useState(false);

  const [modalRenombrar, setModalRenombrar] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [errorAdmin, setErrorAdmin] = useState('');

  useEffect(() => {
    let cancelado = false;
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

  useEffect(() => {
    let cancelado = false;
    listarGastos(token, id)
      .then((datos) => {
        if (!cancelado) setGastos(datos.gastos);
      })
      .catch((err) => {
        if (!cancelado) setErrorGastos(err.message);
      })
      .finally(() => {
        if (!cancelado) setCargandoGastos(false);
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

  const esCreador = grupo?.creado_por === usuario.id;

  async function accionAdmin(accion) {
    setErrorAdmin('');
    try {
      await accion();
    } catch (err) {
      setErrorAdmin(err.detalles?.nombre?.[0] ?? err.message);
    }
  }

  function guardarNombre(e) {
    e.preventDefault();
    return accionAdmin(async () => {
      const datos = await renombrarGrupo(token, id, { nombre: nombreNuevo });
      setGrupo(datos.grupo);
      setModalRenombrar(false);
    });
  }

  function nuevoCodigo() {
    if (!window.confirm('El codigo actual dejara de funcionar. ¿Generar uno nuevo?')) return;
    return accionAdmin(async () => setGrupo((await regenerarCodigo(token, id)).grupo));
  }

  function borrarGrupo() {
    if (!window.confirm('Se borraran el grupo y todos sus gastos y liquidaciones. No se puede deshacer. ¿Continuar?')) return;
    return accionAdmin(async () => {
      await eliminarGrupo(token, id);
      navigate('/dashboard');
    });
  }

  function sacarMiembro(miembro) {
    const aviso =
      miembro.id === usuario.id
        ? '¿Seguro que quieres salir de este grupo?'
        : `¿Expulsar a ${miembro.nombre} del grupo?`;
    if (!window.confirm(aviso)) return;
    return accionAdmin(async () => {
      await quitarMiembro(token, id, miembro.id);
      if (miembro.id === usuario.id) navigate('/dashboard');
      else setMiembros((actuales) => actuales.filter((m) => m.id !== miembro.id));
    });
  }

  function nombreDe(usuarioId) {
    return miembros.find((m) => m.id === usuarioId)?.nombre ?? '—';
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
        <div className={styles.accionesEncabezado}>
          <button type="button" className={styles.codigo} onClick={copiarCodigo}>
            Codigo: <span className={styles.codigoValor}>{grupo.codigo_invitacion}</span>
            <span className={styles.copiar}>{copiado ? 'Copiado' : 'Copiar'}</span>
          </button>
          <Button variant="secondary" onClick={() => navigate(`/grupos/${id}/liquidaciones`)}>
            Balances y liquidaciones
          </Button>
        </div>
      </div>

      <section className={styles.seccion}>
        <h2 className={styles.subtitulo}>Miembros ({miembros.length})</h2>
        <div className={styles.miembros}>
          {miembros.map((miembro) => (
            <div key={miembro.id} className={styles.miembro}>
              <Avatar nombre={miembro.nombre} size={28} />
              <span>{miembro.nombre}</span>
              {miembro.id === grupo.creado_por && <span className={styles.etiqueta}>Creador</span>}
              {miembro.id !== grupo.creado_por && (esCreador || miembro.id === usuario.id) && (
                <button type="button" className={styles.quitar} onClick={() => sacarMiembro(miembro)}>
                  {miembro.id === usuario.id ? 'Salir' : 'Expulsar'}
                </button>
              )}
            </div>
          ))}
        </div>
        {errorAdmin && <p className={styles.mensajeError}>{errorAdmin}</p>}
        {esCreador && (
          <div className={styles.accionesEncabezado}>
            <Button
              variant="secondary"
              onClick={() => {
                setNombreNuevo(grupo.nombre);
                setModalRenombrar(true);
              }}
            >
              Renombrar
            </Button>
            <Button variant="secondary" onClick={nuevoCodigo}>
              Nuevo codigo
            </Button>
            <Button variant="danger" onClick={borrarGrupo}>
              Eliminar grupo
            </Button>
          </div>
        )}
      </section>

      <section className={styles.seccion}>
        <div className={styles.gastosEncabezado}>
          <h2 className={styles.subtitulo}>Gastos</h2>
          <Button onClick={() => setModalNuevoGasto(true)}>Nuevo gasto</Button>
        </div>

        {cargandoGastos && <p className={styles.mensaje}>Cargando gastos...</p>}
        {!cargandoGastos && errorGastos && <p className={styles.mensajeError}>{errorGastos}</p>}

        {!cargandoGastos && !errorGastos && gastos.length === 0 && (
          <Card>
            <p>Todavia no hay gastos en este grupo.</p>
          </Card>
        )}

        {!cargandoGastos && gastos.length > 0 && (
          <div className={styles.gastos}>
            {gastos.map((gasto) => (
              <Card
                key={gasto.id}
                className={styles.gasto}
                onClick={() => navigate(`/grupos/${id}/gastos/${gasto.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/grupos/${id}/gastos/${gasto.id}`)}
              >
                <div>
                  <p className={styles.gastoDescripcion}>{gasto.descripcion}</p>
                  <p className={styles.gastoMeta}>
                    Pagado por {nombreDe(gasto.pagado_por)} · {formatearFecha(gasto.fecha)}
                  </p>
                </div>
                <p className={styles.gastoImporte}>{formatearMoneda(gasto.monto_total)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal open={modalRenombrar} onClose={() => setModalRenombrar(false)} title="Renombrar grupo">
        <form onSubmit={guardarNombre} noValidate>
          <Input label="Nombre del grupo" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} error={errorAdmin} autoFocus required />
          <Button type="submit" fullWidth>
            Guardar
          </Button>
        </form>
      </Modal>

      <Modal open={modalNuevoGasto} onClose={() => setModalNuevoGasto(false)} title="Nuevo gasto">
        <FormularioNuevoGasto
          grupoId={id}
          miembros={miembros}
          onGuardado={(gasto) => {
            setModalNuevoGasto(false);
            navigate(`/grupos/${id}/gastos/${gasto.id}`);
          }}
        />
      </Modal>
    </AppShell>
  );
}
