
export type CSSEasingFunction =
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "linear"
  | "step-start"
  | "step-end"
  | `cubic-bezier(${number}, ${number}, ${number}, ${number})`
  | `steps(${number}, ${"start" | "end" | "jump-start" | "jump-end" | "jump-both" | "jump-none"})`
  | `steps(${number})`
  | "ease-in-sine"
  | "ease-out-sine" 
  | "ease-in-out-sine"
  | "ease-in-quad"
  | "ease-out-quad"
  | "ease-in-out-quad"
  | "ease-in-cubic"
  | "ease-out-cubic"
  | "ease-in-out-cubic"
  | "ease-in-quart"
  | "ease-out-quart"
  | "ease-in-out-quart"
  | "ease-in-quint"
  | "ease-out-quint"
  | "ease-in-out-quint"
  | "ease-in-expo"
  | "ease-out-expo"
  | "ease-in-out-expo"
  | "ease-in-circ"
  | "ease-out-circ"
  | "ease-in-out-circ"
  | "ease-in-back"
  | "ease-out-back"
  | "ease-in-out-back"
  | "ease-in-elastic"
  | "ease-out-elastic"
  | "ease-in-out-elastic"
  | "ease-in-bounce"
  | "ease-out-bounce"
  | "ease-in-out-bounce";

export const CSSEasingPresets = {
    EASE: "ease" as const,
    EASE_IN: "ease-in" as const,
    EASE_OUT: "ease-out" as const,
    EASE_IN_OUT: "ease-in-out" as const,
    LINEAR: "linear" as const,

    SINE_IN: "cubic-bezier(0.47, 0, 0.745, 0.715)" as const,
    SINE_OUT: "cubic-bezier(0.39, 0.575, 0.565, 1)" as const,
    SINE_IN_OUT: "cubic-bezier(0.445, 0.05, 0.55, 0.95)" as const,

    QUAD_IN: "cubic-bezier(0.55, 0.085, 0.68, 0.53)" as const,
    QUAD_OUT: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" as const,
    QUAD_IN_OUT: "cubic-bezier(0.455, 0.03, 0.515, 0.955)" as const,

    CUBIC_IN: "cubic-bezier(0.55, 0.055, 0.675, 0.19)" as const,
    CUBIC_OUT: "cubic-bezier(0.215, 0.61, 0.355, 1)" as const,
    CUBIC_IN_OUT: "cubic-bezier(0.645, 0.045, 0.355, 1)" as const,

    CIRC_IN: "cubic-bezier(0.6, 0.04, 0.98, 0.335)" as const,
    CIRC_OUT: "cubic-bezier(0.075, 0.82, 0.165, 1)" as const,
    CIRC_IN_OUT: "cubic-bezier(0.785, 0.135, 0.15, 0.86)" as const,

    EXPO_IN: "cubic-bezier(0.95, 0.05, 0.795, 0.035)" as const,
    EXPO_OUT: "cubic-bezier(0.19, 1, 0.22, 1)" as const,
    EXPO_IN_OUT: "cubic-bezier(1, 0, 0, 1)" as const,

    BACK_IN: "cubic-bezier(0.6, -0.28, 0.735, 0.045)" as const,
    BACK_OUT: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" as const,
    BACK_IN_OUT: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" as const
};

export type TransitionableCSSProperty =
  | "background"
  | "backgroundColor"
  | "backgroundPosition"
  | "backgroundSize"
  | "border"
  | "borderBottom"
  | "borderBottomColor"
  | "borderBottomWidth"
  | "borderColor"
  | "borderLeft"
  | "borderLeftColor"
  | "borderLeftWidth"
  | "borderRadius"
  | "borderRight"
  | "borderRightColor"
  | "borderRightWidth"
  | "borderTop"
  | "borderTopColor"
  | "borderTopWidth"
  | "borderWidth"
  | "bottom"
  | "boxShadow"
  | "clip"
  | "color"
  | "columnCount"
  | "columnGap"
  | "columnRule"
  | "columnRuleColor"
  | "columnWidth"
  | "columns"
  | "filter"
  | "flex"
  | "flexBasis"
  | "flexGrow"
  | "flexShrink"
  | "font"
  | "fontSize"
  | "fontSizeAdjust"
  | "fontStretch"
  | "fontVariationSettings"
  | "fontWeight"
  | "gridGap"
  | "gridRowGap"
  | "gridColumnGap"
  | "height"
  | "left"
  | "letterSpacing"
  | "lineHeight"
  | "margin"
  | "marginBottom"
  | "marginLeft"
  | "marginRight"
  | "marginTop"
  | "maxHeight"
  | "maxWidth"
  | "minHeight"
  | "minWidth"
  | "objectPosition"
  | "opacity"
  | "order"
  | "outline"
  | "outlineColor"
  | "outlineOffset"
  | "outlineWidth"
  | "padding"
  | "paddingBottom"
  | "paddingLeft"
  | "paddingRight"
  | "paddingTop"
  | "perspective"
  | "perspectiveOrigin"
  | "right"
  | "scrollMargin"
  | "scrollMarginBottom"
  | "scrollMarginLeft"
  | "scrollMarginRight"
  | "scrollMarginTop"
  | "scrollPadding"
  | "scrollPaddingBottom"
  | "scrollPaddingLeft"
  | "scrollPaddingRight"
  | "scrollPaddingTop"
  | "stroke"
  | "strokeDasharray"
  | "strokeDashoffset"
  | "strokeWidth"
  | "textDecoration"
  | "textDecorationColor"
  | "textEmphasis"
  | "textEmphasisColor"
  | "textIndent"
  | "textShadow"
  | "top"
  | "transform"
  | "transformOrigin"
  | "verticalAlign"
  | "visibility"
  | "width"
  | "wordSpacing"
  | "zIndex";

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