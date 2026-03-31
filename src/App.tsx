import type {ReactNode} from "react";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Page from "./components/templates/Page.tsx";
import HomePage from "./pages/HomePage.tsx";

export type Provider = '*';

type AppRoute = {
    path: string;
    element: ReactNode;
    providers?: Provider[];
}

const locations: AppRoute[] = [
    {path: '/', element: <HomePage/>},
    {path: '*', element: <div>Page not found</div>},
];

const router = createBrowserRouter(locations.map(route => ({
    path: route.path,
    element: <Page providers={route.providers}>{route.element}</Page>
})));

function App() {

    return (
        <div className="app">
            <RouterProvider router={router}/>
        </div>
    );
}

export default App;
