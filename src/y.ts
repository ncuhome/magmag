import { WebrtcProvider } from 'y-webrtc'
import * as Y from 'yjs'

export const ydoc = new Y.Doc()

// @ts-ignore
export const provider = new WebrtcProvider('magmag', ydoc, { signaling: ['wss://y-webrtc-signaling.onrender.com'], filterBcConns: false })

export const awareness = provider.awareness
