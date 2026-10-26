import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { editarPerfil, cambiarPassword, eliminarCuenta } from '../api/auth.js';
import { useAuth } from '../context/useAuth.js';
import styles from './Cuenta.module.css';

// Un formulario con su propio estado de envio, error y aviso de exito
function useAccion(ejecutar) {
  const [estado, setEstado] = useState({ enviando: false, error: '', ok: '' });
  async function lanzar(e, mensajeOk) {
    e.preventDefault();
    setEstado({ enviando: true, error: '', ok: '' });
    try {
      await ejecutar();
      setEstado({ enviando: false, error: '', ok: mensajeOk });
    } catch (err) {
      setEstado({ enviando: false, error: err.detalles?.password_nueva?.[0] ?? err.message, ok: '' });
    }
  }
  return [estado, lanzar];
}

function Mensajes({ estado }) {
  return (
    <>
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p className={styles.exito} role="status">
          {estado.ok}
        </p>
      )}
    </>
  );
}

export default function Cuenta() {
  const { token, usuario, actualizarUsuario, logout } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState(usuario.nombre);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [passwordBorrado, setPasswordBorrado] = useState('');

  const [estadoNombre, guardarNombre] = useAccion(async () => {
    actualizarUsuario((await editarPerfil(token, { nombre })).usuario);
  });
  const [estadoPassword, guardarPassword] = useAccion(async () => {
    await cambiarPassword(token, { password_actual: actual, password_nueva: nueva });
    setActual('');
    setNueva('');
  });
  const [estadoBorrado, borrar] = useAccion(async () => {
    await eliminarCuenta(token, { password: passwordBorrado });
    logout();
    navigate('/', { replace: true });
  });

  function confirmarBorrado(e) {
    if (!window.confirm('Se borrara tu cuenta y no se puede deshacer. ¿Continuar?')) {
      e.preventDefault();
      return;
    }
    return borrar(e, '');
  }

  return (
    <AppShell>
      <Link to="/dashboard" className={styles.volver}>
        ← Mis grupos
      </Link>
      <h1>Mi cuenta</h1>
      <p className={styles.email}>{usuario.email}</p>

      <div className={styles.tarjetas}>
        <Card>
          <form className={styles.form} onSubmit={(e) => guardarNombre(e, 'Nombre actualizado')} noValidate>
            <h2 className={styles.titulo}>Nombre</h2>
            <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <Mensajes estado={estadoNombre} />
            <Button type="submit" loading={estadoNombre.enviando}>
              Guardar nombre
            </Button>
          </form>
        </Card>

        <Card>
          <form className={styles.form} onSubmit={(e) => guardarPassword(e, 'Contraseña cambiada')} noValidate>
            <h2 className={styles.titulo}>Contraseña</h2>
            <Input
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
            />
            <Input
              label="Contraseña nueva (8 o mas caracteres)"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
            />
            <Mensajes estado={estadoPassword} />
            <Button type="submit" loading={estadoPassword.enviando}>
              Cambiar contraseña
            </Button>
          </form>
        </Card>

        <Card>
          <form className={styles.form} onSubmit={confirmarBorrado} noValidate>
            <h2 className={styles.titulo}>Eliminar cuenta</h2>
            <p className={styles.ayuda}>
              Se borran tu nombre y tu email. Los grupos en los que estas solo se eliminan. En los demas, si tienes
              gastos, partes asignadas o liquidaciones, tu cuenta se anonimiza como «Usuario eliminado» para no
              descuadrar los balances del resto.
            </p>
            <Input
              label="Tu contraseña"
              type="password"
              autoComplete="current-password"
              value={passwordBorrado}
              onChange={(e) => setPasswordBorrado(e.target.value)}
              required
            />
            <Mensajes estado={estadoBorrado} />
            <Button type="submit" variant="danger" loading={estadoBorrado.enviando}>
              Eliminar mi cuenta
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
