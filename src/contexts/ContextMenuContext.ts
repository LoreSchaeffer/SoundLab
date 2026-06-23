import React, {createContext, type ReactNode, useContext} from 'react';

export type ContextMenuItem = {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    colorClass?: string;
};

type ContextMenuContextType = {
    openContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
    closeContextMenu: () => void;
};

export const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

export const useContextMenu = () => {
    const ctx = useContext(ContextMenuContext);
    if (!ctx) throw new Error("useContextMenu must be used within ContextMenuProvider");
    return ctx;
};