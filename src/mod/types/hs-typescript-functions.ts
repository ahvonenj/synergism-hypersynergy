// Can be used to extend a type while defining a key optional. 
// Example (extending SomeBaseType and making id optional): 
// HSOptional<SomeBaseType, 'id'>
export type HSOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Can be used to extend a type while defining a key required. 
// Example (extending SomeBaseType and making id required): 
// WithRequired<SomeBaseType, 'id'>
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };