import type {PropsWithChildren} from "react";
import type {Provider} from "../../App.tsx";
import Navbar from "./Navbar.tsx";
import {SynthProvider} from "../../contexts/SynthProvider.tsx";
import {PresetProvider} from "../../contexts/PresetProvider.tsx";
import {MidiProvider} from "../../contexts/MidiProvider.tsx";

type PageProps = PropsWithChildren & {
    providers?: Provider[];
}

const Page = ({providers = [], children}: PageProps) => {
    let content = <>{children}</>;

    if (providers.includes('midi')) content = <MidiProvider>{content}</MidiProvider>;
    if (providers.includes('preset')) content = <PresetProvider>{content}</PresetProvider>;
    if (providers.includes('synth')) content = <SynthProvider>{content}</SynthProvider>;

    console.log(providers.includes('synth'), providers.includes('preset'), providers.includes('midi'))

    return (
        <>
            <Navbar/>
            <div className={'page'}>
                {content}
            </div>
        </>
    );
};

export default Page;