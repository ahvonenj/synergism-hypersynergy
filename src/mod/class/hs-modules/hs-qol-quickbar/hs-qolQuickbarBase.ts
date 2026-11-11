import { HSLogger } from "../../hs-core/hs-logger";

export abstract class HSQOLQuickbarBase {
    protected container: HTMLDivElement | null = null;
    protected abstract readonly context: string;
    protected abstract readonly sectionIdInternal: string;
    protected abstract readonly sectionIdCss: string;
    protected abstract createDOM(): void;
    protected abstract cleanupDOM(): void;
    protected abstract onSetup(): void | Promise<void>;
    protected abstract onTeardown(): void;

    public createSection(): HTMLElement {
        const section = document.createElement('div');
        section.id = this.sectionIdCss;
        section.className = 'hs-quickbar';
        return section;
    }

    public async setup(container: HTMLDivElement): Promise<void> {
        if (this.container) {
            HSLogger.debug(() => `${this.context} setup called but already initialized`, this.context);
            return;
        }
        this.container = container;
        this.createDOM();
        await this.onSetup();
    }

    public teardown(): void {
        try {
            this.onTeardown();
        } catch (e) {
            HSLogger.warn(`${this.context}: error during onTeardown: ${e}`, this.context);
        }

        try {
            this.cleanupDOM();
        } catch (e) {
            HSLogger.warn(`${this.context}: error during cleanupDOM: ${e}`, this.context);
        }

        this.container = null;
    }
}
