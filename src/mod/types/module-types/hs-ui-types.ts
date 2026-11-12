/*
    Type definition collection: HS UI types
    Description: Collection of types specific to hs-ui and hs-ui-components modules
    Author: Swiffy
*/

import { HSOptional } from "../hs-typescript-functions";

export enum EPredefinedPosition {
    CENTER = 1,
    RIGHT = 2,
    LEFT = 3
}

export type HSUIXY = { x: number; y: number };

export type HSUIDOMCoordinates = HSUIXY | EPredefinedPosition;

export type HSPanelTabDefinition = {
    tabId: number;
    tabBodySel: string;
    tabSel: string;
    panelDisplayType: "flex" | "block";
}

export enum HSInputType {
    CHECK = 1,
    COLOR = 2,
    NUMBER = 3,
    TEXT = 4,
    SELECT = 5
}

/** Inline style properties by their name on `element.style` (camelCase). A number without a unit is written as is. */
export type HSCSSProperties = {
    [K in keyof CSSStyleDeclaration as K extends string ? (CSSStyleDeclaration[K] extends string ? K : never) : never]?: string | number;
}

export type CSSValue = string | number | undefined | null;
export type CSSKeyValueObject = { [key: string]: CSSValue }
export type HTMLProps = { [key: string]: string | undefined };

interface HSUICOptions {
    id: string;
    class?: string;
    data?: Map<string, string>;
    styles?: HSCSSProperties;
    props?: HTMLProps;
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

export interface HSUICImageOptions extends HSOptional<HSUICOptions, 'id'> {
    src: string;
    width?: number;
    height?: number;
}

export interface HSUICPOptions extends HSOptional<HSUICOptions, 'id'> {
    text?: string | string[];
}

export interface HSUICGridOptions extends HSOptional<HSUICOptions, 'id'> {
    html?: string | string[];
}

export interface HSUIModalOptions extends HSOptional<HSUICOptions, 'id'> {
    htmlContent?: string;
    position?: HSUIDOMCoordinates;
    needsToLoad?: boolean;
    title?: string;
    parentModalId?: string;
    headerClass?: string;
    bodyClass?: string;
    // Called with the modal laid out, its CSS applied, before it is placed and shown
    onBeforeShow?: (modal: HTMLElement) => void;
    /** Runs once after CloseModal removes the window. */
    onClose?: (modal: HTMLDivElement) => void;
}

export type HSNotifyPosition = "topLeft" | "top" | "topRight" | "right" | "bottomRight" | "bottom" | "bottomLeft" | "left";
export type HSNotifyType = "default" | "warning" | "error" | "success";
export type HSNotifyColumn = "top" | "bottomLeft";

export interface HSNotifyOptions {
    // "bottomLeft" has its own column, any other value goes in the top-centre one
    position: HSNotifyPosition;
    popDuration: number;
    // A minimum: a caller can make a notification last longer, never cut a long text short
    displayDuration: number;
    hideDuration: number;
    notificationType: HSNotifyType;
}

export interface HSNotification {
    text: string;
    notificationType: HSNotifyType;
    column: HSNotifyColumn;
    element: HTMLElement;
    lifetime: Animation;
    onRemoved: () => void;
}

export interface HSUICModalOptions extends HSUICOptions {
    htmlContent?: string;
    title?: string;
    headerClass?: string;
    bodyClass?: string;
}

export interface HSUICSelectOption {
    value: string | number;
    text: string;
    selected?: boolean;
}
