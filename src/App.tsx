import type {ReactNode} from "react";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Page from "./components/templates/Page.tsx";
import HomePage from "./pages/HomePage.tsx";
import PresetGeneratorPage from "./pages/PresetGeneratorPage.tsx";
import PlaygroundPage from "./pages/PlaygroundPage.tsx";
import MixerPage from "./pages/MixerPage.tsx";

export type Provider = 'synth' | 'preset' | 'midi';

type AppRoute = {
    path: string;
    element: ReactNode;
    providers?: Provider[];
    showNav?: boolean;
}

const locations: AppRoute[] = [
    {path: '/', element: <HomePage/>, providers: ['synth'], showNav: false},
    {path: '/playground', element: <PlaygroundPage/>, providers: ['synth', 'preset']},
    {path: '/mixer', element: <MixerPage/>, providers: ['synth', 'preset']},
    {path: '/preset-generator', element: <PresetGeneratorPage/>, providers: ['synth', 'preset', 'midi']},
    {path: '*', element: <div>Page not found</div>},
];

const router = createBrowserRouter(locations.map(route => ({
    path: route.path,
    element: <Page providers={route.providers} showNav={route.showNav}>{route.element}</Page>
})));

function App() {

    return (
        <div className="app">
            <RouterProvider router={router}/>
        </div>
    );
}

export default App;
