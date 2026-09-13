import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Auth.module.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

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
      await login({ email, password });
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
        <h1 className={styles.title}>Bienvenido de nuevo</h1>
        <p className={styles.subtitle}>Inicia sesion para ver tus grupos</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errores.password}
          required
        />
        {errorGeneral && <p className={styles.errorGeneral}>{errorGeneral}</p>}
        <Button type="submit" fullWidth loading={enviando}>
          Entrar
        </Button>
      </form>
      <p className={styles.footer}>
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className={styles.link}>
          Crea una
        </Link>
      </p>
    </AuthLayout>
  );
}
