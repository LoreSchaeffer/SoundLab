import {type PropsWithChildren, useCallback, useEffect, useRef, useState} from 'react';
import {MidiContext, type MidiDevice} from './MidiContext.ts';
import {type MidiParsedMessage, parseMidiMessage} from '../utils/midi.ts';

interface WebMidiMessageEvent {
    data: Uint8Array;
}

interface WebMidiPort {
    id: string;
    name?: string;
    manufacturer?: string;
    state: 'connected' | 'disconnected';
}

interface WebMidiInput extends WebMidiPort {
    onmidimessage: ((event: WebMidiMessageEvent) => void) | null;
}

interface WebMidiOutput extends WebMidiPort {
}

interface WebMidiAccess {
    inputs: {
        forEach: (callback: (input: WebMidiInput) => void) => void;
        get: (id: string) => WebMidiInput | undefined;
    };
    outputs: {
        forEach: (callback: (output: WebMidiOutput) => void) => void;
    };
    onstatechange: (() => void) | null;
}

type WebMidiNavigator = {
    requestMIDIAccess?: (options?: { sysex: boolean }) => Promise<unknown>;
};

export const MidiProvider = ({children}: PropsWithChildren) => {
    const [isSupported] = useState<boolean>(() => typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator);
    const [hasPermission, setHasPermission] = useState(false);

    const [inputs, setInputs] = useState<MidiDevice[]>([]);
    const [outputs, setOutputs] = useState<MidiDevice[]>([]);
    const [activeInputId, setActiveInputId] = useState<string | null>(null);

    const [ccMappings, setCcMappings] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem('midi_mappings');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const midiAccessRef = useRef<WebMidiAccess | null>(null);
    const listenersRef = useRef<Set<(msg: MidiParsedMessage) => void>>(new Set());

    const addMidiListener = useCallback((callback: (msg: MidiParsedMessage) => void) => {
        listenersRef.current.add(callback);
    }, []);

    const removeMidiListener = useCallback((callback: (msg: MidiParsedMessage) => void) => {
        listenersRef.current.delete(callback);
    }, []);

    const refreshDevices = useCallback((access: WebMidiAccess) => {
        const newInputs: MidiDevice[] = [];
        const newOutputs: MidiDevice[] = [];

        access.inputs.forEach((input) => {
            newInputs.push({
                id: input.id,
                name: input.name || `MIDI Input ${newInputs.length + 1}`,
                manufacturer: input.manufacturer || 'Unknown',
                state: input.state
            });
        });

        access.outputs.forEach((output) => {
            newOutputs.push({
                id: output.id,
                name: output.name || `MIDI Output ${newOutputs.length + 1}`,
                manufacturer: output.manufacturer || 'Unknown',
                state: output.state
            });
        });

        setInputs(newInputs);
        setOutputs(newOutputs);

        if (newInputs.length > 0 && !activeInputId) {
            setActiveInputId(newInputs[0].id);
        } else if (newInputs.length === 0) {
            setActiveInputId(null);
        }
    }, [activeInputId]);

    const setCcMapping = useCallback((actionId: string, cc: number | null) => {
        setCcMappings(prev => {
            const newMappings = {...prev};

            if (cc === null) delete newMappings[actionId];
            else newMappings[actionId] = cc;

            localStorage.setItem('midi_mappings', JSON.stringify(newMappings));
            return newMappings;
        });
    }, []);

    useEffect(() => {
        if (!isSupported) {
            console.warn("Web MIDI API not supported in this browser.");
            return;
        }

        let isMounted = true;
        const nav = navigator as unknown as WebMidiNavigator;

        nav.requestMIDIAccess?.({sysex: false})
            .then((nativeAccess) => {
                if (!isMounted) return;

                const access = nativeAccess as WebMidiAccess;

                midiAccessRef.current = access;
                setHasPermission(true);
                refreshDevices(access);

                access.onstatechange = () => {
                    refreshDevices(access);
                };
            })
            .catch((err) => {
                console.error("Accesso MIDI negato:", err);
                setHasPermission(false);
            });

        return () => {
            isMounted = false;
            if (midiAccessRef.current) {
                midiAccessRef.current.onstatechange = null;
            }
        };
    }, [isSupported, refreshDevices]);

    useEffect(() => {
        const access = midiAccessRef.current;
        if (!access) return;

        const handleMidiMessage = (event: WebMidiMessageEvent) => {
            const parsed = parseMidiMessage(event.data);
            if (parsed.type !== 'unknown') listenersRef.current.forEach(listener => listener(parsed));
        };

        access.inputs.forEach((input) => {
            input.onmidimessage = null;
        });

        if (activeInputId) {
            const activeInput = access.inputs.get(activeInputId);
            if (activeInput) activeInput.onmidimessage = handleMidiMessage;
        }

        return () => {
            if (access) {
                access.inputs.forEach((input) => {
                    input.onmidimessage = null;
                });
            }
        };
    }, [activeInputId, hasPermission]);

    return (
        <MidiContext.Provider value={{
            isSupported,
            hasPermission,
            inputs,
            outputs,
            activeInputId,
            setActiveInputId,

            ccMappings,
            setCcMapping,

            addMidiListener,
            removeMidiListener
        }}>
            {children}
        </MidiContext.Provider>
    );
};