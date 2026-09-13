import { useId } from 'react';
import styles from './Input.module.css';

export default function Input({ label, error, id, className = '', ...props }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={[styles.field, className].join(' ')}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input id={inputId} className={[styles.input, error ? styles.inputError : ''].join(' ')} {...props} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
