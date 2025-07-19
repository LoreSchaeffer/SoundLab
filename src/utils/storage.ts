import type {Note} from "./music.ts";
import type {Color} from "./colors.ts";
import type {WaveformType} from "./waveform.ts";

export type StorageData = {
    tempo: number;
    sequencers: {
        index: number;
        color: Color;
        waveform: WaveformType;
        amplitude: number;
        cols: number;
        sequence: Record<number, Note[]>;
    }[];
}

export function saveToStorage(data: StorageData) {
    try {
        localStorage.setItem('sequencers', JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save to localStorage:", e);
    }
}

export function loadFromStorage(): StorageData | null {
    try {
        const data = localStorage.getItem('sequencers');
        if (data) return JSON.parse(data) as StorageData;
    } catch (e) {
        console.error("Failed to load from localStorage:", e);
    }

    return null;
}

export function clearStorage() {
    try {
        localStorage.removeItem('sequencers');
    } catch (e) {
        console.error("Failed to clear localStorage:", e);
    }
}

export function downloadData(data: StorageData, filename: string = "sequencers.json") {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function uploadData(file: File): Promise<StorageData | null> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string) as StorageData;
                resolve(data);
            } catch (e) {
                console.error("Failed to parse uploaded data:", e);
                reject(e);
            }
        };
        reader.onerror = (e) => {
            console.error("File reading error:", e);
            reject(e);
        };
        reader.readAsText(file);
    });
}