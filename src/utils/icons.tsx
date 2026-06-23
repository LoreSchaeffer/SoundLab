import type {IconType} from 'react-icons';
import {LuPiano} from 'react-icons/lu';
import {MdMusicNote, MdOutlinePiano} from 'react-icons/md';
import {PiWaveSawtoothBold, PiWaveSineBold, PiWaveSquareBold, PiWaveTriangleBold} from "react-icons/pi";
import {GiTrumpet, GiViolin} from "react-icons/gi";
import {FaGuitar} from "react-icons/fa6";

export const INST_ICONS: Record<string, IconType> = {
    'sine': PiWaveSineBold,
    'square': PiWaveSquareBold,
    'triangle': PiWaveTriangleBold,
    'sawtooth': PiWaveSawtoothBold,
    'piano': LuPiano,
    'synth': MdOutlinePiano,
    'organ': MdOutlinePiano,
    'trumpet': GiTrumpet,
    'guitar': FaGuitar,
    'violin': GiViolin,
};

export const getInstrumentIcon = (presetId?: string | null, size: number = 14) => {
    if (!presetId) return <MdMusicNote size={size}/>;

    const IconComponent = INST_ICONS[presetId] || MdMusicNote;

    return <IconComponent size={size}/>;
};