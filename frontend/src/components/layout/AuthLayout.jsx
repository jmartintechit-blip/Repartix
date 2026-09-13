import Logo from '../ui/Logo.jsx';
import styles from './AuthLayout.module.css';

export default function AuthLayout({ children }) {
  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <Logo size="lg" />
        {children}
      </div>
    </div>
  );
}
