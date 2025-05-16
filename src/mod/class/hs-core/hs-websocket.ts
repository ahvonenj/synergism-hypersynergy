import { HSWebSocketObject, HSWebSocketRegistrationParams } from "../../types/module-types/hs-websocket-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./module/hs-module";

export class HSWebSocket extends HSModule {

    #webSockets: Map<string, HSWebSocketObject<any>> = new Map();
    #exponentialBackoff = [5000, 15000, 30000, 60000];

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }
    
    async init() {
        HSLogger.log(`Initializing HSWebsocket module`, this.context);
        this.isInitialized = true;
    }

    #reRegisterWebSocket<T>(name: string, socket: HSWebSocketRegistrationParams<T>) {
        this.unregisterWebSocket(name);
        this.registerWebSocket(name, socket);
    }

    registerWebSocket<T>(name: string, socket: HSWebSocketRegistrationParams<T>) {
        const self = this;

        if(this.#webSockets.has(name)) {
            HSLogger.warn(`Tried to register websocket ${name} again`, this.context);
            return;
        }

        if(!socket.url) {
            HSLogger.error(`Tried to register websocket ${name} without a URL`, this.context);
            return;
        }

        const webSocketObject : HSWebSocketObject<T> = {
            socket: new WebSocket(socket.url),
            reconnectionTries: 0,
            onClose: socket.onClose ?? HSUtils.Noop,
            onOpen: socket.onOpen ?? HSUtils.Noop,
            onMessage: socket.onMessage ?? HSUtils.Noop,
            onRetriesFailed: socket.onRetriesFailed ?? HSUtils.Noop,
        }

        const onCloseHandler = async (event: CloseEvent) => {
            const delay = self.#exponentialBackoff[++webSocketObject.reconnectionTries];

            if (delay !== undefined) {
                setTimeout(() => { self.#reRegisterWebSocket(name, socket)}, delay)
            } else {
                HSLogger.warn(`WebSocket ${name} failed to reconnect after ${webSocketObject.reconnectionTries} tries`);
                await (socket.onRetriesFailed ?? HSUtils.Noop)();
            }

            await (socket.onClose ?? HSUtils.Noop)();
        };

        const onMessageHandler = async (event: MessageEvent) => {
            let parsedData: T | undefined;

            try {
                parsedData = JSON.parse(event.data) as T | undefined;
            } catch (error) {
                HSLogger.warn(`Failed to parse WebSocket message for ${name}: ${error}`, this.context);
                parsedData = undefined;
            }

            await (socket.onMessage ?? HSUtils.Noop)(parsedData);
        };

        webSocketObject.socket.onclose = onCloseHandler;
        webSocketObject.socket.onopen = webSocketObject.onOpen;
        webSocketObject.socket.onmessage = onMessageHandler;

        this.#webSockets.set(name, webSocketObject);

        HSLogger.log(`Registered websocket ${name}`, this.context);
    }

    unregisterWebSocket(name: string) {
        const socketObject = this.#webSockets.get(name);

        if(socketObject) {
            socketObject.socket.close();
            this.#webSockets.delete(name);

            HSLogger.log(`Unregistered websocket ${name}`, this.context);
        } else {
            HSLogger.debug(`Could not unregister websocket ${name}`, this.context);
        }
    }

    getWebSocket<T>(name: string): HSWebSocketObject<T> | undefined {
        return this.#webSockets.get(name);
    }
}