import {type ReactNode, useCallback, useEffect, useMemo, useState} from "react";
import {type NoteEvent, SequencerContext, type ToolType, type Track} from "./SequencerContext.ts";
import type {ScaleType} from "../types";

const createDefaultTrack = (): Track => ({
    id: crypto.randomUUID(),
    name: "Track 1",
    presetId: "sine",
    volume: 0.8,
    isMuted: false,
    isSolo: false,
    isExpanded: true,
    notes: []
});

export const SequencerProvider = ({children}: { children: ReactNode }) => {
    const initialState = useMemo(() => {
        try {
            const saved = localStorage.getItem('daw_project');
            if (saved) return JSON.parse(saved);
        } catch {
            console.error("Error reading daw project");
        }
        return null;
    }, []);

    const [bpm, setBpm] = useState<number>(initialState?.bpm || 120);
    const [masterVolume, setMasterVolume] = useState<number>(initialState?.masterVolume ?? 0.8);
    const [tracks, setTracks] = useState<Track[]>(initialState?.tracks || [createDefaultTrack()]);

    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isLooping, setIsLooping] = useState<boolean>(true);
    const [playheadBeat, setPlayheadBeat] = useState<number>(0);

    const [snapResolution, setSnapResolution] = useState<number>(initialState?.snapResolution ?? 2);
    const [activeTool, setActiveTool] = useState<ToolType>('pointer');

    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(initialState?.tracks?.[0]?.id || null);
    const [isStepRecording, setIsStepRecording] = useState(false);

    const [clipboard, setClipboard] = useState<Omit<NoteEvent, 'id'>[]>([]);

    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
    const [scaleRoot, setScaleRoot] = useState<string>('C');
    const [scaleType, setScaleType] = useState<ScaleType>('chromatic');

    useEffect(() => {
        localStorage.setItem('daw_project', JSON.stringify({bpm, tracks, masterVolume, snapResolution}));
    }, [bpm, tracks, masterVolume, snapResolution]);

    const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
    const toggleLoop = useCallback(() => setIsLooping(p => !p), []);

    const totalBeats = useMemo(() => {
        let maxEnd = 0;
        tracks.forEach(t => t.notes.forEach(n => {
            const end = n.startBeat + n.durationBeats;
            if (end > maxEnd) maxEnd = end;
        }));
        return Math.max(32, Math.ceil((maxEnd + 16) / 4) * 4);
    }, [tracks]);

    const clearProject = useCallback(() => {
        setTracks([createDefaultTrack()]);
        setBpm(120);
        setMasterVolume(0.8);
        setPlayheadBeat(0);
        setIsPlaying(false);
    }, []);

    const loadProject = useCallback((data: { bpm: number; tracks: Track[]; masterVolume?: number }) => {
        if (data.bpm) setBpm(data.bpm);
        if (data.tracks) setTracks(data.tracks);
        if (data.masterVolume !== undefined) setMasterVolume(data.masterVolume);
        setPlayheadBeat(0);
        setIsPlaying(false);
    }, []);

    const addTrack = useCallback(() => {
        setTracks(prev => [
            ...prev,
            {...createDefaultTrack(), name: `Track ${prev.length + 1}`, isExpanded: false}
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

    const addNotes = useCallback((trackId: string, newNotes: Omit<NoteEvent, 'id'>[]) => {
        setTracks(prev => prev.map(t => {
            if (t.id !== trackId) return t;
            const notesWithIds = newNotes.map(n => ({...n, id: crypto.randomUUID()}));
            return {
                ...t,
                notes: [...t.notes, ...notesWithIds]
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

    const contextValue = useMemo(() => ({
        bpm, setBpm,
        isPlaying, setIsPlaying, togglePlay,
        isLooping, toggleLoop,

        masterVolume, setMasterVolume,

        playheadBeat, setPlayheadBeat,
        totalBeats,

        snapResolution, setSnapResolution,
        activeTool, setActiveTool,

        selectedTrackId, setSelectedTrackId,

        isStepRecording, setIsStepRecording,

        clipboard, setClipboard,

        selectedNoteIds, setSelectedNoteIds,
        scaleRoot, setScaleRoot,
        scaleType, setScaleType,

        tracks,
        addTrack,
        removeTrack,
        updateTrack,
        toggleTrackExpand,

        addNote,
        addNotes,
        updateNote,
        removeNote,

        clearProject,
        loadProject
    }), [
        bpm, setBpm,
        isPlaying, setIsPlaying, togglePlay,
        isLooping, toggleLoop,

        masterVolume, setMasterVolume,

        playheadBeat, setPlayheadBeat,
        totalBeats,

        snapResolution, setSnapResolution,
        activeTool, setActiveTool,

        selectedTrackId, setSelectedTrackId,

        isStepRecording, setIsStepRecording,

        clipboard, setClipboard,

        selectedNoteIds, setSelectedNoteIds,
        scaleRoot, setScaleRoot,
        scaleType, setScaleType,

        tracks,
        addTrack,
        removeTrack,
        updateTrack,
        toggleTrackExpand,

        addNote,
        addNotes,
        updateNote,
        removeNote,

        clearProject,
        loadProject
    ]);

    return (
        <SequencerContext.Provider value={contextValue}>
            {children}
        </SequencerContext.Provider>
    );
};