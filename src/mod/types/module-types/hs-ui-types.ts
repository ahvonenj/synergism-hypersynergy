/*
    Type definition collection: HS UI types
    Description: Collection of types specific to hs-ui and hs-ui-components modules
    Author: Swiffy
*/

import { TransitionableCSSProperty, HSUICCSSProperties } from "../hs-css-types";
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

export interface HTMLData {
    key: string;
    value: string;
}

export enum HSInputType {
    CHECK = 1,
    COLOR = 2,
    NUMBER = 3,
    TEXT = 4,
    SELECT = 5,
    STATE = 6
}

export type TransitionProperties = {
    [K in TransitionableCSSProperty]?: string | number;
}

export type CSSValue = string | number | undefined | null;
export type CSSKeyValueObject = { [key: string]: CSSValue }
export type HTMLProps = { [key: string]: string | undefined };

interface HSUICOptions {
    id: string;
    class?: string;
    data?: HTMLData[];
    styles?: HSUICCSSProperties;
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

export interface HSUICFlexOptions extends HSOptional<HSUICOptions, 'id'> {
    html?: string | string[];
}

export interface HSUIModalOptions extends HSOptional<HSUICOptions, 'id'> {
    htmlContent?: string;
    position?: HSUIDOMCoordinates;
    needsToLoad?: boolean;
}

export type HSNotifyPosition = "topLeft" | "top" | "topRight" | "right" | "bottomRight" | "bottom" | "bottomLeft" | "left";
export type HSNotifyType = "default" | "warning" | "error" | "success";

export interface HSNotifyOptions {
    position: HSNotifyPosition;
    popDuration: number;
    displayDuration: number;
    hideDuration: number;
    notificationType: HSNotifyType;
}

export interface HSUICModalOptions extends HSUICOptions {
    htmlContent?: string;
}

export interface HSUICSelectOption {
    value: string | number;
    text: string;
    selected?: boolean;
}