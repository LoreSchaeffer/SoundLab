import styles from './Notification.module.css';
import {useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import {MdCheckCircle, MdClose, MdError, MdInfo, MdWarning} from 'react-icons/md';
import type {NotificationConfig} from "../../pages/NotificationContext.ts";

type NotificationProps = {
    config: Required<NotificationConfig>;
    onClose: () => void;
};

const Notification = ({config, onClose}: NotificationProps) => {
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(), 300);
    };

    useEffect(() => {
        if (config.duration > 0) {
            const timer = setTimeout(handleClose, config.duration);
            return () => clearTimeout(timer);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.duration]);

    const Icon = useMemo(() => {
        switch (config.variant) {
            case 'success':
                return <MdCheckCircle/>;
            case 'warning':
                return <MdWarning/>;
            case 'danger':
                return <MdError/>;
            case 'info':
            default:
                return <MdInfo/>;
        }
    }, [config.variant]);

    return (
        <div className={clsx(styles.notification, styles[config.variant], isExiting && styles.exit)} role="alert">
            <div className={styles.content}>
                <div className={styles.icon}>{Icon}</div>
                <div className={styles.textContainer}>
                    {config.title && <h4 className={styles.title}>{config.title}</h4>}
                    <div className={styles.message}>{config.message}</div>
                </div>
                {config.closable && (
                    <button className={styles.closeBtn} onClick={handleClose} aria-label="Chiudi notifica">
                        <MdClose/>
                    </button>
                )}
            </div>

            {config.duration > 0 && (
                <div className={styles.progressTrack}>
                    <div className={styles.progressBar} style={{animationDuration: `${config.duration}ms`}}/>
                </div>
            )}
        </div>
    );
};

export default Notification;