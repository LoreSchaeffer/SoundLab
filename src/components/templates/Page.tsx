import {type PropsWithChildren, useEffect} from "react";
import type {Provider} from "../../App.tsx";
import Navbar from "./Navbar.tsx";
import {SynthProvider} from "../../contexts/SynthProvider.tsx";
import {PresetProvider} from "../../contexts/PresetProvider.tsx";
import {MidiProvider} from "../../contexts/MidiProvider.tsx";
import {useAudio} from "../../contexts/AudioContext.ts";
import clsx from "clsx";

type PageProps = PropsWithChildren & {
    providers?: Provider[];
    showNav?: boolean;
}

const Page = ({providers = [], showNav = true, children}: PageProps) => {
    const {isAudioReady, initAudio} = useAudio();

    let content = <>{children}</>;

    if (providers.includes('midi')) content = <MidiProvider>{content}</MidiProvider>;
    if (providers.includes('preset')) content = <PresetProvider>{content}</PresetProvider>;
    if (providers.includes('synth')) content = <SynthProvider>{content}</SynthProvider>;

    useEffect(() => {
        if (isAudioReady) return;

        let isUnlocking = false;

        const unlockAudio = async () => {
            if (isUnlocking || isAudioReady) return;
            isUnlocking = true;

            try {
                await initAudio();
            } catch (e) {
                console.warn("Cannot unlock audio in background. A strong interaction is needed.", e);
            } finally {
                isUnlocking = false;
            }
        };

        const domEvents = ['mousedown', 'touchstart', 'keydown', 'scroll'];

        domEvents.forEach(event => {
            window.addEventListener(event, unlockAudio, {once: true, passive: true});
        });

        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(access => {
                access.inputs.forEach(input => {
                    input.addEventListener('midimessage', unlockAudio, {once: true});
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                access.addEventListener('statechange', (e: any) => {
                    if (e.port.type === 'input' && e.port.state === 'connected') {
                        e.port.addEventListener('midimessage', unlockAudio, {once: true});
                    }
                });
            }).catch(() => {
            });
        }

        return () => {
            domEvents.forEach(event => window.removeEventListener(event, unlockAudio));
        };
    }, [isAudioReady, initAudio]);

    return (
        <>
            {showNav && <Navbar/>}
            <div className={clsx('page', showNav && 'padding')}>
                {content}
            </div>
        </>
    );
};

export default Page;