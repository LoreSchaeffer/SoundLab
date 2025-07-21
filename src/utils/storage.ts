import type {Color} from "./colors.ts";
import type {WaveformType} from "./waveform.ts";

export type SequencerData = {
    waveform: WaveformType;
    amplitude: number;
    cols: number;
    sequence: Record<number, string[]>;
}

export type FullSequencerData = SequencerData & {
    index: number;
    color: Color;
}

export type StorageData = {
    tempo: number;
    sequencers: FullSequencerData[];
}

export function saveToStorage(data: StorageData | null) {
    try {
        if (data == null) localStorage.removeItem('sequencers');
        else localStorage.setItem('sequencers', JSON.stringify(data));
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

export function uploadData(): Promise<StorageData | null> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) {
                document.body.removeChild(input);
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string) as StorageData;
                    resolve(data);
                } catch (error) {
                    console.error("Failed to parse uploaded data:", error);
                    reject(error);
                }
                document.body.removeChild(input);
            };
            reader.onerror = (error) => {
                console.error("File reading error:", error);
                reject(error);
                document.body.removeChild(input);
            };
            reader.readAsText(file);
        };
        input.click();
    });
}