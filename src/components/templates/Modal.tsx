import styles from './Modal.module.css';
import React, {useEffect} from 'react';
import {MdClose} from 'react-icons/md';
import clsx from 'clsx';
import type {ModalConfig} from "../../pages/ModalContext.ts";

type ModalProps = {
    isOpen: boolean;
    config: ModalConfig;
    onClose: () => void;
};

const Modal = ({isOpen, config, onClose}: ModalProps) => {
    const {title, content, footer, size = 'md', closeOnBackdropClick = true, bodyStyle} = config;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) onClose();
    };

    return (
        <div className={clsx(styles.backdrop, isOpen && styles.backdropOpen)} onClick={handleBackdropClick}>
            <div className={clsx(styles.modal, isOpen && styles.modalOpen, styles[size])}>

                {!config.hideHeader && (
                    <div className={styles.header}>
                        <h3 className={styles.title}>{title}</h3>
                        <button className={styles.closeBtn} onClick={onClose} title="Chiudi">
                            <MdClose/>
                        </button>
                    </div>
                )}

                <div className={styles.body} style={bodyStyle}>
                    {content}
                </div>

                {footer && (
                    <div className={styles.footer}>
                        {footer}
                    </div>
                )}

            </div>
        </div>
    );
};

export default Modal;