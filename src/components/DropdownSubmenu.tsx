import styles from "./DropdownSubmenu.module.css";
import {Dropdown} from "react-bootstrap";
import {type PropsWithChildren, type ReactNode, useState} from "react";

export type DropdownSubmenuProps = PropsWithChildren & {
    toggle: ReactNode;
    direction?: 'up' | 'up-centered' | 'down' | 'down-centered' | 'start' | 'end';
    className?: string;
    toggleClassName?: string;
}

export function DropdownSubmenu({className, toggle, direction = 'end', toggleClassName, children}: DropdownSubmenuProps) {
    const [show, setShow] = useState(false);

    return (
        <Dropdown
            className={`${styles.dropdownSubmenu} ${className || ''}`}
            show={show}
            drop={direction}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            <Dropdown.Toggle
                as={'div'}
                className={`${styles.dropdownToggle} ${toggleClassName || ''}`}
            >
                {toggle}
            </Dropdown.Toggle>
            <Dropdown.Menu>
                {children}
            </Dropdown.Menu>
        </Dropdown>
    )
}