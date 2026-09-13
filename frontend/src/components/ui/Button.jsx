import styles from './Button.module.css';

const VARIANTES = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
};

export default function Button({
  variant = 'primary',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      className={[styles.button, VARIANTES[variant], fullWidth ? styles.fullWidth : '', className].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : children}
    </button>
  );
}
