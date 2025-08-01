import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import {Navigation} from './components/nav/Navigation';
import './App.css';
import {HomePage} from "./components/pages/HomePage.tsx";
import {PlaygroundPage} from "./components/pages/PlaygroundPage.tsx";
import {MixerPage} from "./components/pages/MixerPage.tsx";
import {AboutPage} from "./components/pages/AboutPage.tsx";
import {SequencerPage} from "./components/pages/SequencerPage.tsx";

function App() {
    return (
        <Router>
            <div className="App">
                <Navigation/>
                <Routes>
                    <Route path="/" element={<HomePage/>}/>
                    <Route path="/playground" element={<PlaygroundPage/>}/>
                    <Route path="/mixer" element={<MixerPage/>}/>
                    <Route path="/sequencer" element={<SequencerPage/>}/>
                    <Route path="/about" element={<AboutPage/>}/>
                    <Route path="*" element={<HomePage/>}/>
                </Routes>
            </div>
        </Router>
    );
}

export default App;
