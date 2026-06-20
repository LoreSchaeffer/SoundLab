import {type ReactNode, useCallback, useState} from "react";
import {type NoteEvent, SequencerContext, type Track} from "./SequencerContext.ts";

export const SequencerProvider = ({children}: { children: ReactNode }) => {
    const [bpm, setBpm] = useState<number>(120);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [playheadBeat, setPlayheadBeat] = useState<number>(0);
    const [totalBeats, setTotalBeats] = useState<number>(32); // Default: 8 misure da 4/4

    const [tracks, setTracks] = useState<Track[]>([
        {
            id: crypto.randomUUID(),
            name: "Track 1",
            presetId: null,
            volume: 0.8,
            isMuted: false,
            isSolo: false,
            isExpanded: true,
            notes: []
        }
    ]);

    const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

    const addTrack = useCallback(() => {
        setTracks(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: `Track ${prev.length + 1}`,
                presetId: null,
                volume: 0.8,
                isMuted: false,
                isSolo: false,
                isExpanded: false,
                notes: []
            }
        ]);
    }, []);

    const removeTrack = useCallback((trackId: string) => {
        setTracks(prev => prev.filter(t => t.id !== trackId));
    }, []);

    const updateTrack = useCallback((trackId: string, updates: Partial<Track>) => {
        setTracks(prev => prev.map(t => t.id === trackId ? {...t, ...updates} : t));
    }, []);

    const toggleTrackExpand = useCallback((trackId: string) => {
        setTracks(prev => prev.map(t => {
            if (t.id === trackId) return {...t, isExpanded: !t.isExpanded};
            return t;
        }));
    }, []);

    const addNote = useCallback((trackId: string, noteData: Omit<NoteEvent, 'id'>) => {
        setTracks(prev => prev.map(t => {
            if (t.id !== trackId) return t;

            return {
                ...t,
                notes: [...t.notes, {...noteData, id: crypto.randomUUID()}]
            };
        }));
    }, []);

    const updateNote = useCallback((trackId: string, noteId: string, updates: Partial<NoteEvent>) => {
        setTracks(prev => prev.map(t => {
            if (t.id !== trackId) return t;

            return {
                ...t,
                notes: t.notes.map(n => n.id === noteId ? {...n, ...updates} : n)
            };
        }));
    }, []);

    const removeNote = useCallback((trackId: string, noteId: string) => {
        setTracks(prev => prev.map(t => {
            if (t.id !== trackId) return t;

            return {
                ...t,
                notes: t.notes.filter(n => n.id !== noteId)
            };
        }));
    }, []);

    return (
        <SequencerContext.Provider value={{
            bpm, setBpm,
            isPlaying, togglePlay,
            playheadBeat, setPlayheadBeat,
            totalBeats, setTotalBeats,
            tracks, addTrack, removeTrack, updateTrack, toggleTrackExpand,
            addNote, updateNote, removeNote
        }}>
            {children}
        </SequencerContext.Provider>
    );
};