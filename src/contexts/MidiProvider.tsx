import {type FC, type ReactNode, useEffect, useRef, useState} from 'react';
import * as Tone from 'tone';
import {MidiContext, type MidiListener} from "./MidiContext.ts";

export const MidiProvider: FC<{ children: ReactNode }> = ({children}) => {
    const [ready, setReady] = useState(false);

    const listeners = useRef<Set<MidiListener>>(new Set());

    useEffect(() => {
        if (!navigator.requestMIDIAccess) {
            console.warn("Your browser does not support Web MIDI API. MIDI features will be disabled.");
            return;
        }

        navigator.requestMIDIAccess().then((midiAccess) => {
            setReady(true);

            const handleMidiMessage = (event: MIDIMessageEvent) => {
                if (!event.data) return;

                const [status, noteNumber, rawVelocity] = event.data;
                const command = status >> 4;
                const noteName = Tone.Frequency(noteNumber, "midi").toNote();
                const velocity = rawVelocity / 127;

                if (command === 9 && velocity > 0) listeners.current.forEach(l => l.onNoteOn(noteName, velocity));
                else if (command === 8 || (command === 9 && velocity === 0)) listeners.current.forEach(l => l.onNoteOff(noteName));
            };

            midiAccess.inputs.forEach((input) => input.onmidimessage = handleMidiMessage);

            midiAccess.onstatechange = (e) => {
                const port = e.port as MIDIPort;
                if (port.type === 'input' && port.state === 'connected') (port as MIDIInput).onmidimessage = handleMidiMessage;
            };
        }).catch(err => console.error("Error in MIDI access:", err));
    }, []);

    const subscribe = (listener: MidiListener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
    };

    return (
        <MidiContext.Provider value={{ready: ready, subscribe}}>
            {children}
        </MidiContext.Provider>
    );
};