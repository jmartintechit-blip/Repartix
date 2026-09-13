import styles from './Badge.module.css';

const TONOS = {
  neutral: styles.neutral,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
};

export default function Badge({ tone = 'neutral', children }) {
  return <span className={[styles.badge, TONOS[tone]].join(' ')}>{children}</span>;
}
