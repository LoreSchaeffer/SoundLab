import styles from './Navigation.module.css';
import {Container, Nav, Navbar} from 'react-bootstrap';
import LanguageSelector from "../LanguageSelector.tsx";
import {NavLink} from "./NavLink.tsx";

export function Navigation() {
    return (
        <Navbar bg="dark" variant="dark" expand="lg" className={styles.navbar}>
            <Container fluid>
                <Navbar.Brand className={styles.navbarBrand + ' alternative-font'}>
                    <NavLink to={'/'} text={'sound_lab'} icon={'music'}/>
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto align-items-center">
                        <NavLink to={'/playground'} text={'navigation.playground'} icon={'wave'}/>
                        <NavLink to={'/mixer'} text={'navigation.mixer'} icon={'mixer'}/>
                        <NavLink to={'/sequencer'} text={'navigation.sequencer'} icon={'sequencer'}/>
                        <NavLink to={'/about'} text={'navigation.about'} icon={'about'}/>

                        <Nav.Item className={"ms-3"}>
                            <LanguageSelector/>
                        </Nav.Item>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};
