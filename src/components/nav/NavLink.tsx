import styles from "./NavLink.module.css";
import {LinkContainer} from "react-router-bootstrap";
import {useTranslation} from "react-i18next";
import {Nav} from 'react-bootstrap';
import {useLocation} from "react-router-dom";

export type NavLinkProps = {
    to: string;
    icon?: string;
    text: string;
}

export function NavLink({to, icon, text}: NavLinkProps) {
    const {t} = useTranslation();
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <LinkContainer to={to}>
            <Nav.Link className={`${styles.navLink} ${isActive ? styles.active : ''}`}>
                {icon && <img src={`/images/icons/${icon}.png`} alt={t(text)}/>}
                {t(text)}
            </Nav.Link>
        </LinkContainer>
    );
}