import {createContext, type Dispatch, type SetStateAction, useContext} from "react";
import type {ScaleType} from "../types";

export type NoteEvent = {
    id: string;
    pitch: string;          // e.g. "C4", "F#3"
    startBeat: number;      // Start position (e.g. 0 = song start, 1.5 = second beat off-beat)
    durationBeats: number;  // Duration in beats (e.g. 0.25 for a sixteenth, 1 for a quarter)
    velocity: number;       // Volume of the single note (0.0 - 1.0)
};

export type Track = {
    id: string;
    name: string;
    presetId: string | null;
    volume: number;
    isMuted: boolean;
    isSolo: boolean;
    isExpanded: boolean;
    notes: NoteEvent[];
};

export type ToolType = 'pointer' | 'split';

type SequencerContextType = {
    // Reproduction state
    bpm: number;
    setBpm: (bpm: number) => void;
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    togglePlay: () => void;
    isLooping: boolean;
    toggleLoop: () => void;

    masterVolume: number;
    setMasterVolume: (v: number) => void;

    playheadBeat: number;
    setPlayheadBeat: Dispatch<SetStateAction<number>>;
    totalBeats: number; // Project length

    snapResolution: number;
    setSnapResolution: Dispatch<SetStateAction<number>>;
    activeTool: ToolType;
    setActiveTool: Dispatch<SetStateAction<ToolType>>;

    selectedTrackId: string | null;
    setSelectedTrackId: Dispatch<SetStateAction<string | null>>;

    isStepRecording: boolean;
    setIsStepRecording: Dispatch<SetStateAction<boolean>>;

    clipboard: Omit<NoteEvent, 'id'>[];
    setClipboard: Dispatch<SetStateAction<Omit<NoteEvent, 'id'>[]>>;

    selectedNoteIds: string[];
    setSelectedNoteIds: Dispatch<SetStateAction<string[]>>;
    scaleRoot: string;
    setScaleRoot: Dispatch<SetStateAction<string>>;
    scaleType: ScaleType;
    setScaleType: Dispatch<SetStateAction<ScaleType>>;

    // Tracks state
    tracks: Track[];
    addTrack: () => void;
    removeTrack: (trackId: string) => void;
    updateTrack: (trackId: string, updates: Partial<Track>) => void;
    toggleTrackExpand: (trackId: string) => void;

    // Notes management
    addNote: (trackId: string, note: Omit<NoteEvent, 'id'>) => void;
    addNotes: (trackId: string, notes: Omit<NoteEvent, 'id'>[]) => void;
    updateNote: (trackId: string, noteId: string, updates: Partial<NoteEvent>) => void;
    removeNote: (trackId: string, noteId: string) => void;

    // Project Management
    clearProject: () => void;
    loadProject: (data: { bpm: number; tracks: Track[] }) => void;
}

export const SequencerContext = createContext<SequencerContextType | undefined>(undefined);

export const useSequencer = () => {
    const context = useContext(SequencerContext);
    if (context === undefined) throw new Error('useSequencer must be used within a SequencerProvider');
    return context;
};