import { HSModuleOptions } from "../../types/hs-types";
import { HSWebSocketObject, HSWebSocketRegistrationParams } from "../../types/module-types/hs-websocket-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./module/hs-module";

export class HSWebSocket extends HSModule {

    #webSockets: Map<string, HSWebSocketObject<any>> = new Map();
    #exponentialBackoff = [5000, 15000, 30000, 60000];

    constructor(moduleOptions : HSModuleOptions) {
        super(moduleOptions);
    }
    
    async init() {
        HSLogger.log(`Initializing HSWebsocket module`, this.context);
        this.isInitialized = true;
    }

    #reRegisterWebSocket<T>(name: string, socket: HSWebSocketRegistrationParams<T>) {
        this.unregisterWebSocket(name);
        this.registerWebSocket(name, socket);
    }

    registerWebSocket<T>(name: string, regParams: HSWebSocketRegistrationParams<T>) {
        const self = this;

        if(this.#webSockets.has(name)) {
            HSLogger.warn(`Tried to register websocket ${name} again`, this.context);
            return;
        }

        if(!regParams.url) {
            HSLogger.error(`Tried to register websocket ${name} without a URL`, this.context);
            return;
        }

        const webSocketObject : HSWebSocketObject<T> = {
            socket: new WebSocket(regParams.url),
            reconnectionTries: 0,
            onClose: regParams.onClose ?? HSUtils.Noop,
            onOpen: regParams.onOpen ?? HSUtils.Noop,
            onMessage: regParams.onMessage ?? HSUtils.Noop,
            onRetriesFailed: regParams.onRetriesFailed ?? HSUtils.Noop,
            regParams: regParams
        }

        const onCloseHandler = async (event: CloseEvent) => {
            const ws = self.#webSockets.get(name);

            if(!ws) {
                HSLogger.warnOnce(`wsOnClose(): Socket ${name} not found`, self.context);
                return;
            }

            const delay = self.#exponentialBackoff[++ws.reconnectionTries];

            if (delay !== undefined) {
                setTimeout(() => { self.#reRegisterWebSocket(name, ws.regParams)}, delay);
            } else {
                HSLogger.warn(`WebSocket ${name} failed to reconnect after ${webSocketObject.reconnectionTries} tries`);
                await (ws.onRetriesFailed ?? HSUtils.Noop)();
            }

            await (ws.onClose ?? HSUtils.Noop)(event);
        };

        const onMessageHandler = async (event: MessageEvent) => {
            const ws = self.#webSockets.get(name);

            if(!ws) {
                HSLogger.warnOnce(`wsOnOpen(): Socket ${name} not found`, self.context);
                return;
            }

            let parsedData: T | undefined;

            try {
                parsedData = JSON.parse(event.data) as T | undefined;
            } catch (error) {
                HSLogger.warn(`Failed to parse WebSocket message for ${name}: ${error}`, this.context);
                parsedData = undefined;
            }

            await (ws.onMessage ?? HSUtils.Noop)(parsedData);
        };

        const onOpenHandler = async (event: Event) => {
            const ws = self.#webSockets.get(name);

            if(!ws) {
                HSLogger.warnOnce(`wsOnOpen(): Socket ${name} not found`, self.context);
                return;
            }

            ws.reconnectionTries = 0;

            await (ws.onOpen ?? HSUtils.Noop)(event);
        };

        webSocketObject.socket.onclose = onCloseHandler;
        webSocketObject.socket.onopen = onOpenHandler;
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