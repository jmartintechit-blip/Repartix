import { Link } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import styles from './Auth.module.css';

export default function Registro() {
  return (
    <AuthLayout>
      <div>
        <h1 className={styles.title}>Crea tu cuenta</h1>
        <p className={styles.subtitle}>Empieza a repartir gastos con tu grupo</p>
      </div>
      <form className={styles.form}>
        <Input label="Nombre" type="text" placeholder="Tu nombre" autoComplete="name" />
        <Input label="Email" type="email" placeholder="tu@email.com" autoComplete="email" />
        <Input label="Contraseña" type="password" placeholder="Minimo 8 caracteres" autoComplete="new-password" />
        <Button type="submit" fullWidth>
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
