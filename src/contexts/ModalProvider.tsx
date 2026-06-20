import {type PropsWithChildren, useCallback, useState} from 'react';
import {type ModalConfig, ModalContext} from './ModalContext.ts';
import Modal from "../components/templates/Modal.tsx";

export const ModalProvider = ({children}: PropsWithChildren) => {
    const [config, setConfig] = useState<ModalConfig | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const openModal = useCallback((newConfig: ModalConfig) => {
        setConfig(newConfig);
        setIsOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        setTimeout(() => setConfig(null), 200);
    }, []);

    return (
        <ModalContext.Provider value={{openModal, closeModal, isOpen}}>
            {children}
            {config && (
                <Modal
                    isOpen={isOpen}
                    config={config}
                    onClose={closeModal}
                />
            )}
        </ModalContext.Provider>
    );
};