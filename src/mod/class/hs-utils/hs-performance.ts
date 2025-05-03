import { HSLogger } from "../hs-core/hs-logger";

/*
    Class: HSPerformance
    IsExplicitHSModule: No
    Description: 
        Hypersynergism module for performance monitoring and optimization.
        Provides methods to measure and log performance metrics.
    Author: Swiffy
*/
export class HSPerformance {
    
    static #measurements: Map<string, HSPerformanceMeasurement> = new Map<string, HSPerformanceMeasurement>();

    static beginMeasure(name: string) {
        const measurement = new HSPerformanceMeasurement(name).beginMeasure();
        HSPerformance.#measurements.set(name, measurement);
    }

    static endMeasure(name: string): HSPerformanceMeasurement {
        const measurement = HSPerformance.#measurements.get(name);

        if (measurement) {
            const measureCopy: HSPerformanceMeasurement = measurement.clone();
            measureCopy.endTime = performance.now();
            measureCopy.duration = measureCopy.endTime - measureCopy.startTime!;

            HSPerformance.#measurements.delete(name);

            return measureCopy;
        } else {
            throw new Error(`No measurement found for ${name}`);
        }
    }
}

/*
    Class: HSPerformanceMeasurement
    IsExplicitHSModule: No
    Description: 
        Encapsulates a performance measurement.
    Author: Swiffy
*/
export class HSPerformanceMeasurement {
    name: string;
    startTime?: number;
    endTime?: number;
    duration?: number;

    constructor(name: string, startTime?: number, endTime?: number, duration?: number) {
        this.name = name;
        this.startTime = startTime ?? undefined;
        this.endTime = endTime ?? undefined;
        this.duration = duration ?? undefined;
        return this;
    }

    beginMeasure() {
        this.startTime = performance.now();
        return this;
    }

    endMeasure() {
        this.endTime = performance.now();
        this.duration = this.endTime - this.startTime!;
        return this;
    }

    clone(): HSPerformanceMeasurement {
        return new HSPerformanceMeasurement(this.name, this.startTime, this.endTime, this.duration);
    }

    toLoggableString(): string {
        return `HSPerformanceMeasurement: ${this.name} - Start: ${this.startTime}ms, End: ${this.endTime}ms, Duration: ${this.duration}ms`;
    }

    logToConsole() {
        console.log(this.toLoggableString());
    }

    logToConsoleJSON() {
        console.log(this.toJSON());
    }

    toJSON(): string {
        return JSON.stringify({
            name: this.name,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.duration
        });
    }
}