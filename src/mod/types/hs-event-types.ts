// Define event type mapping for common events
export interface EventMap {
    // Mouse events
    'click': MouseEvent;
    'contextmenu': MouseEvent;
    'dblclick': MouseEvent;
    'mousedown': MouseEvent;
    'mouseenter': MouseEvent;
    'mouseleave': MouseEvent;
    'mousemove': MouseEvent;
    'mouseout': MouseEvent;
    'mouseover': MouseEvent;
    'mouseup': MouseEvent;

    // Drag events
    'drag': DragEvent;
    'dragend': DragEvent;
    'dragenter': DragEvent;
    'dragleave': DragEvent;
    'dragover': DragEvent;
    'dragstart': DragEvent;
    'drop': DragEvent;

    // Keyboard events
    'keydown': KeyboardEvent;
    'keypress': KeyboardEvent;
    'keyup': KeyboardEvent;

    // Form events
    'submit': Event;
    'reset': Event;
    'input': InputEvent;
    'change': Event;
    'focus': FocusEvent;
    'blur': FocusEvent;
}