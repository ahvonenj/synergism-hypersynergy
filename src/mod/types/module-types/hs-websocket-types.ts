export interface HSWebSocketObject<T> {
    socket: WebSocket;
    reconnectionTries: number;
    onClose: (...args: any[]) => Promise<void>;
    onOpen: (...args: any[]) => Promise<void>;
    onMessage: (msg?: T | undefined) => Promise<void>;
    onRetriesFailed: (...args: any[]) => Promise<void>;
}

export interface HSWebSocketRegistrationParams<T> {
    url: string;
    onClose?: (...args: any[]) => Promise<void>;
    onOpen?: (...args: any[]) => Promise<void>;
    onMessage?: (msg?: T | undefined) => Promise<void>;
    onRetriesFailed?: (...args: any[]) => Promise<void>;
}