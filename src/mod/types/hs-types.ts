export type HSModuleDefinition = {
	className: string;
	context?: string;
	moduleName?: string;
}

export enum ELogType {
	log = 1,
	warn = 2,
	error = 3
}