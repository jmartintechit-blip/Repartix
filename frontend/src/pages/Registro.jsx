import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Auth.module.css';

export default function Registro() {
  const { registro } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrores({});
    setErrorGeneral('');
    setEnviando(true);
    try {
      await registro({ nombre, email, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.detalles) {
        setErrores(Object.fromEntries(Object.entries(err.detalles).map(([campo, msgs]) => [campo, msgs[0]])));
      } else {
        setErrorGeneral(err.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <div>
        <h1 className={styles.title}>Crea tu cuenta</h1>
        <p className={styles.subtitle}>Empieza a repartir gastos con tu grupo</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label="Nombre"
          type="text"
          placeholder="Tu nombre"
          autoComplete="name"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errores.email}
          required
        />
        <Input
          label="Contraseña"
          type="password"
          placeholder="Minimo 8 caracteres"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errores.password}
          required
        />
        {errorGeneral && <p className={styles.errorGeneral}>{errorGeneral}</p>}
        <Button type="submit" fullWidth loading={enviando}>
          Crear cuenta
        </Button>
      </form>
      <p className={styles.footer}>
        ¿Ya tienes cuenta?{' '}
        <Link to="/" className={styles.link}>
          Inicia sesion
        </Link>
      </p>
    </AuthLayout>
  );
}
