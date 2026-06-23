import './index.css'
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.tsx'
import './i18n/config.ts';
import {AudioProvider} from "./contexts/AudioProvider.tsx";
import {ModalProvider} from "./contexts/ModalProvider.tsx";
import {NotificationProvider} from "./contexts/NotificationProvider.tsx";
import {PresetProvider} from "./contexts/PresetProvider.tsx";
import {SynthProvider} from "./contexts/SynthProvider.tsx";
import {MidiProvider} from "./contexts/MidiProvider.tsx";
import {ContextMenuProvider} from "./contexts/ContextMenuProvider.tsx";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AudioProvider>
            <PresetProvider>
                <SynthProvider>
                    <MidiProvider>
                        <NotificationProvider>
                            <ModalProvider>
                                <ContextMenuProvider>
                                    <App/>
                                </ContextMenuProvider>
                            </ModalProvider>
                        </NotificationProvider>
                    </MidiProvider>
                </SynthProvider>
            </PresetProvider>
        </AudioProvider>
    </StrictMode>,
)
