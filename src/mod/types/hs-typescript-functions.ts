// Can be used to extend a type while defining a key optional. 
// Example (extending SomeBaseType and making id optional): 
// HSOptional<SomeBaseType, 'id'>
export type HSOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
