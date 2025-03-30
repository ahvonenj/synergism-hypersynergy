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

export interface HSUICCSSProperties {
    // Layout: Dimensions
    width?: string | number;
    height?: string | number;
    minWidth?: string | number;
    minHeight?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;

    // Layout: Display and Position
    display?: 'block' | 'inline' | 'flex' | 'grid' | 'inline-block' | 'inline-flex' | 'inline-grid' | 'none' | string;
    position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    left?: string | number;
    zIndex?: number;

    // Flexbox
    flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
    flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    flexFlow?: string;
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
    flex?: string | number;
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: string | number;
    alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
    order?: number;

    // Grid
    gridTemplateColumns?: string;
    gridTemplateRows?: string;
    gridTemplateAreas?: string;
    gridTemplate?: string;
    gridAutoColumns?: string;
    gridAutoRows?: string;
    gridAutoFlow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense';
    grid?: string;
    gridRowStart?: string | number;
    gridRowEnd?: string | number;
    gridColumnStart?: string | number;
    gridColumnEnd?: string | number;
    gridRow?: string;
    gridColumn?: string;
    gridArea?: string;
    gap?: string | number;
    rowGap?: string | number;
    columnGap?: string | number;

    // Spacing: Margin
    margin?: string | number;
    marginTop?: string | number;
    marginRight?: string | number;
    marginBottom?: string | number;
    marginLeft?: string | number;

    // Spacing: Padding
    padding?: string | number;
    paddingTop?: string | number;
    paddingRight?: string | number;
    paddingBottom?: string | number;
    paddingLeft?: string | number;

    // Borders
    border?: string;
    borderTop?: string;
    borderRight?: string;
    borderBottom?: string;
    borderLeft?: string;
    borderWidth?: string | number;
    borderTopWidth?: string | number;
    borderRightWidth?: string | number;
    borderBottomWidth?: string | number;
    borderLeftWidth?: string | number;
    borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | string;
    borderTopStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | string;
    borderRightStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | string;
    borderBottomStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | string;
    borderLeftStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | string;
    borderColor?: string;
    borderTopColor?: string;
    borderRightColor?: string;
    borderBottomColor?: string;
    borderLeftColor?: string;

    // Border Radius
    borderRadius?: string | number;
    borderTopLeftRadius?: string | number;
    borderTopRightRadius?: string | number;
    borderBottomRightRadius?: string | number;
    borderBottomLeftRadius?: string | number;

    // Outline
    outline?: string;
    outlineWidth?: string | number;
    outlineStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | string;
    outlineColor?: string;
    outlineOffset?: string | number;

    // Typography
    color?: string;
    font?: string;
    fontFamily?: string;
    fontSize?: string | number;
    fontStyle?: 'normal' | 'italic' | 'oblique';
    fontWeight?: number | 'normal' | 'bold' | 'lighter' | 'bolder';
    fontVariant?: string;
    lineHeight?: string | number;
    letterSpacing?: string | number;
    textAlign?: 'left' | 'right' | 'center' | 'justify';
    textDecoration?: 'none' | 'underline' | 'overline' | 'line-through' | string;
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
    textIndent?: string | number;
    wordSpacing?: string | number;
    wordBreak?: 'normal' | 'break-all' | 'keep-all' | 'break-word';
    wordWrap?: 'normal' | 'break-word';
    whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line';

    // Background
    background?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundRepeat?: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';
    backgroundPosition?: string;
    backgroundSize?: string;
    backgroundAttachment?: 'scroll' | 'fixed' | 'local';
    backgroundClip?: 'border-box' | 'padding-box' | 'content-box' | 'text';
    backgroundOrigin?: 'border-box' | 'padding-box' | 'content-box';

    // Transforms
    transform?: string;
    transformOrigin?: string;
    perspective?: string | number;
    perspectiveOrigin?: string;
    backfaceVisibility?: 'visible' | 'hidden';

    // Transitions and Animations
    transition?: string;
    transitionProperty?: string;
    transitionDuration?: string | number;
    transitionTimingFunction?: string;
    transitionDelay?: string | number;
    animation?: string;
    animationName?: string;
    animationDuration?: string | number;
    animationTimingFunction?: string;
    animationDelay?: string | number;
    animationIterationCount?: number | 'infinite';
    animationDirection?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    animationFillMode?: 'none' | 'forwards' | 'backwards' | 'both';
    animationPlayState?: 'running' | 'paused';

    // Visibility and Overflow
    visibility?: 'visible' | 'hidden' | 'collapse';
    opacity?: number;
    overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
    overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
    overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';

    // Box Model
    boxSizing?: 'content-box' | 'border-box';
    boxShadow?: string;

    // Lists
    listStyle?: string;
    listStyleType?: 'none' | 'disc' | 'circle' | 'square' | 'decimal' | string;
    listStylePosition?: 'inside' | 'outside';
    listStyleImage?: string;

    // Tables
    tableLayout?: 'auto' | 'fixed';
    borderCollapse?: 'collapse' | 'separate';
    borderSpacing?: string | number;
    emptyCells?: 'show' | 'hide';

    // Miscellaneous
    cursor?: 'auto' | 'default' | 'pointer' | 'help' | 'wait' | 'progress' | 'text' | 'move' | 'not-allowed' | string;
    pointerEvents?: 'auto' | 'none';
    userSelect?: 'none' | 'auto' | 'text' | 'contain' | 'all';
    resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

export type CSSValue = string | number | undefined | null;
export type CSSKeyValueObject = { [key: string]: CSSValue }

type HSOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface HSUICOptions {
    id: string;
    class?: string;
    data?: HTMLData[];
    styles?: HSUICCSSProperties;
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
}

export interface HSUICFlexOptions extends HSOptional<HSUICOptions, 'id'> {
    html?: string | string[];
}

export interface HSUIModalOptions extends HSOptional<HSUICOptions, 'id'> {
    htmlContent?: string;
    position?: HSUIDOMCoordinates;
    needsToLoad?: boolean;
}

export interface HSUICModalOptions extends HSUICOptions {
    htmlContent?: string;
}
