import styles from './AnimatedBackground.module.css';

export default function AnimatedBackground({className}: { className?: string } = {}) {
    return (
        <div className={`${styles.animatedBackground} ${className || ''}`}>
            <div className={`${styles.circle} ${styles.c1}`}></div>
            <div className={`${styles.circle} ${styles.c2}`}></div>
            <div className={`${styles.circle} ${styles.c3}`}></div>
            <div className={`${styles.circle} ${styles.c4}`}></div>
        </div>
    );
}