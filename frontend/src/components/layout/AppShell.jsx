import { Link } from 'react-router-dom';
import Logo from '../ui/Logo.jsx';
import styles from './AppShell.module.css';

export default function AppShell({ children }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/dashboard" className={styles.logoLink}>
            <Logo size="sm" />
          </Link>
          <nav className={styles.nav}>{/* enlaces reales en fases siguientes */}</nav>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
