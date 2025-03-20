export enum EModalPosition {
	CENTER = 1,
	RIGHT = 2,
	LEFT = 3
}

export type HSUIXY = { x: number; y: number };

export type HSUIDOMCoordinates = HSUIXY | EModalPosition;

export type HSPanelTabDefinition = {
	tabId: number;
	tabBodySel: string;
	tabSel: string;
}

export interface HTMLData {
	key: string;
	value: string;
}

interface HSUICOptions {
	id: string;
	class?: string;
	data?: HTMLData[];
}

export interface HSUICButtonOptions extends HSUICOptions {
	text?: string;
}

export interface HSUIModalOptions {
	id?: string;
	class?: string;
	htmlContent?: string;
	position?: HSUIDOMCoordinates;
	needsToLoad?: boolean;
}

export interface HSUICModalOptions extends HSUICOptions {
	htmlContent?: string;
}