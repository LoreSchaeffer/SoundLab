import {type PropsWithChildren, useEffect} from "react";
import Navbar from "./Navbar.tsx";
import {useAudio} from "../../contexts/AudioContext.ts";
import clsx from "clsx";

type PageProps = PropsWithChildren & {
    showNav?: boolean;
    usePadding?: boolean;
}

const Page = ({showNav = true, usePadding = true, children}: PageProps) => {
    const {isAudioReady, initAudio} = useAudio();

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
            <div className={clsx('page', usePadding && 'padding')}>
                {children}
            </div>
        </>
    );
};

export default Page;