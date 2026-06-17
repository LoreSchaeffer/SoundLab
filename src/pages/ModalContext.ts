import React, {createContext, type CSSProperties, useContext} from 'react';

export type ModalConfig = {
    title?: string;
    content: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    closeOnBackdropClick?: boolean;
    hideHeader?: boolean;
    bodyStyle?: CSSProperties;
};

export type ModalContextType = {
    openModal: (config: ModalConfig) => void;
    closeModal: () => void;
    isOpen: boolean;
};

export const ModalContext = createContext<ModalContextType | null>(null);

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) throw new Error("useModal must be used within a ModalProvider");
    return context;
};