import styles from './ContextMenu.module.css';
import React, {type ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {ContextMenuContext, type ContextMenuItem} from "./ContextMenuContext.ts";
import {createPortal} from "react-dom";

export const ContextMenuProvider = ({children}: { children: ReactNode }) => {
    const [state, setState] = useState({isOpen: false, x: 0, y: 0, items: [] as ContextMenuItem[]});

    const menuRef = useRef<HTMLDivElement>(null);

    const openContextMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
        e.preventDefault();
        e.stopPropagation();

        const x = Math.min(e.clientX, window.innerWidth - 160);
        const y = Math.min(e.clientY, window.innerHeight - (items.length * 32));

        setState({isOpen: true, x, y, items});
    }, []);

    const closeContextMenu = useCallback(() => setState(s => ({...s, isOpen: false})), []);

    useEffect(() => {
        if (!state.isOpen) return;

        const handleOutsideAction = (e: Event) => {
            if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
            closeContextMenu();
        };

        window.addEventListener('mousedown', handleOutsideAction);
        window.addEventListener('scroll', handleOutsideAction, true);

        return () => {
            window.removeEventListener('mousedown', handleOutsideAction);
            window.removeEventListener('scroll', handleOutsideAction, true);
        };
    }, [state.isOpen, closeContextMenu]);

    return (
        <ContextMenuContext.Provider value={{openContextMenu, closeContextMenu}}>
            {children}
            {state.isOpen && createPortal(
                <div
                    ref={menuRef}
                    className={styles.menu}
                    style={{top: state.y, left: state.x}}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {state.items.map((item, i) => (
                        <button
                            key={i}
                            className={styles.item}
                            style={{color: item.colorClass}}
                            onClick={(e) => {
                                e.stopPropagation();
                                item.onClick();
                                closeContextMenu();
                            }}
                        >
                            {item.icon && <span className={styles.icon}>{item.icon}</span>}
                            {item.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </ContextMenuContext.Provider>
    );
};