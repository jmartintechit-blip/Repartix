import styles from './PantallaCarga.module.css';

export default function PantallaCarga() {
  return (
    <div className={styles.wrapper}>
      <span className={styles.spinner} aria-hidden="true" />
    </div>
  );
}
