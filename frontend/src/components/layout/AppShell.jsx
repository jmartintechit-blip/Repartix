import { Link, useNavigate } from 'react-router-dom';
import Logo from '../ui/Logo.jsx';
import Button from '../ui/Button.jsx';
import Avatar from '../ui/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './AppShell.module.css';

export default function AppShell({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/dashboard" className={styles.logoLink}>
            <Logo size="sm" />
          </Link>
          {usuario && (
            <nav className={styles.nav}>
              <Avatar nombre={usuario.nombre} size={32} />
              <Button variant="ghost" onClick={handleLogout}>
                Cerrar sesion
              </Button>
            </nav>
          )}
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
