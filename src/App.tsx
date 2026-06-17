import type {ReactNode} from "react";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Page from "./components/templates/Page.tsx";
import HomePage from "./pages/HomePage.tsx";
import PlaygroundPage from "./pages/PlaygroundPage.tsx";
import MixerPage from "./pages/MixerPage.tsx";

export type Provider = 'synth' | 'midi';

type AppRoute = {
    path: string;
    element: ReactNode;
    showNav?: boolean;
}

const locations: AppRoute[] = [
    {path: '/', element: <HomePage/>, showNav: false},
    {path: '/playground', element: <PlaygroundPage/>,},
    {path: '/mixer', element: <MixerPage/>},
    {path: '*', element: <div>Page not found</div>},
];

const router = createBrowserRouter(locations.map(route => ({
    path: route.path,
    element: <Page showNav={route.showNav}>{route.element}</Page>
})));

function App() {

    return (
        <div className="app">
            <RouterProvider router={router}/>
        </div>
    );
}

export default App;
