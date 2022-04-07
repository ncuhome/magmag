import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

export const doc = new Y.Doc()

export const provider = new WebsocketProvider('wss://y-websocket-server.onrender.com', 'magmag', doc)

export const awareness = provider.awareness

export const THROTTLE_TIME = 120
