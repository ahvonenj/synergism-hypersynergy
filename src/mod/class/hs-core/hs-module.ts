import { HSLogger } from "./hs-logger";

// Abstract HSModule class
// Meant to be extended from
export abstract class HSModule {
	protected moduleName : string;
	protected context : string;

	constructor(moduleName: string, context: string) {
		this.moduleName = moduleName;
		this.context = context;

		HSLogger.log(`Enabled module '${moduleName}'`);
	}

	abstract init() : void;

	getName() : string {
		return this.moduleName;
	}
}