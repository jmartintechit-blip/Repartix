import { Link } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import styles from './Auth.module.css';

export default function Login() {
  return (
    <AuthLayout>
      <div>
        <h1 className={styles.title}>Bienvenido de nuevo</h1>
        <p className={styles.subtitle}>Inicia sesion para ver tus grupos</p>
      </div>
      <form className={styles.form}>
        <Input label="Email" type="email" placeholder="tu@email.com" autoComplete="email" />
        <Input label="Contraseña" type="password" placeholder="••••••••" autoComplete="current-password" />
        <Button type="submit" fullWidth>
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
