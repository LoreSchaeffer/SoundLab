import {MidiProvider} from "../contexts/MidiProvider.tsx";
import SynthController from "../components/SynthController.tsx";
import {SynthProvider} from "../contexts/SynthProvider.tsx";

const HomePage = () => {

    return (
        <SynthProvider>
            <MidiProvider>
                <SynthController/>
            </MidiProvider>
        </SynthProvider>
    );
};

export default HomePage;