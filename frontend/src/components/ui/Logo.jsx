import styles from './Logo.module.css';

export default function Logo({ size = 'md' }) {
  return (
    <div className={[styles.logo, styles[size]].join(' ')}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.mark}>
        <path
          d="M6 3h20a1 1 0 0 1 1 1v24l-2.5-2-2.5 2-2.5-2-2.5 2-2.5-2-2.5 2-2.5-2-2.5 2V4a1 1 0 0 1 1-1Z"
          fill="var(--color-primary)"
        />
        <rect x="10" y="9" width="12" height="2" rx="1" fill="white" opacity="0.9" />
        <rect x="10" y="14" width="12" height="2" rx="1" fill="white" opacity="0.9" />
        <rect x="10" y="19" width="7" height="2" rx="1" fill="white" opacity="0.9" />
      </svg>
      <span className={styles.wordmark}>Repartix</span>
    </div>
  );
}
