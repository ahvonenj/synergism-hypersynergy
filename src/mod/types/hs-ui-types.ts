/*
    Type definition collection: HS UI types
    Description: Collection of types specific to hs-ui and hs-ui-components modules
    Author: Swiffy
*/

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
    panelDisplayType: "flex" | "block";
}

export interface HTMLData {
    key: string;
    value: string;
}

export enum HSInputType {
    CHECK = 1,
    COLOR = 2,
    NUMBER = 3,
    TEXT = 4,
}

type HSOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface HSUICOptions {
    id: string;
    class?: string;
    data?: HTMLData[];
}

export interface HSUICButtonOptions extends HSUICOptions {
    text?: string;
}

export interface HSUICInputOptions extends HSUICOptions {
    type: HSInputType;
}

export interface HSUICDivOptions extends HSOptional<HSUICOptions, 'id'> {
    html?: string | string[];
}

export interface HSUICGridOptions extends HSOptional<HSUICOptions, 'id'> {
    html?: string | string[];
    rowTemplate: string;
    colTemplate: string;
    rowGap?: string;
    colGap?: string;
}

export interface HSUIModalOptions extends HSOptional<HSUICOptions, 'id'> {
    htmlContent?: string;
    position?: HSUIDOMCoordinates;
    needsToLoad?: boolean;
}

export interface HSUICModalOptions extends HSUICOptions {
    htmlContent?: string;
}
