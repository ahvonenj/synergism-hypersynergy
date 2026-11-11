import type { HSDialogKind } from '../class/hs-core/dialogs/hs-game-dialogs';
import type { ConsumableGameEvents } from './data-types/hs-event-data';
import type { PseudoCoinUpgradeNames, TalismanKeys } from './data-types/hs-gamedata-api-types';
import type { TalismanShards } from './data-types/hs-player-savedata';
import type { HSHeaderButtonLayout, HSHeaderButtonDropTarget } from '../class/hs-core/header/hs-header-buttons';

/** Hooks supplied by the shared patcher. Optional for bookmarklets and older loaders. */
declare global {
    interface Window {
        HS_LOADER_INITIALIZED?: boolean;
        __HS_REPO?: string;
        __HS_VERSION?: string;
        __HS_PATCH_REPORT?: Record<string, boolean>;
        __HS_PATCH_AMBIGUOUS?: string[];
        __HS_STAGE_EXPOSED?: boolean;
        __HS_EXPORT_EXPOSED?: boolean;
        __HS_EXPORT_OUTPUT_PATCHED?: boolean;
        __HS_SILENT_EXPORT?: boolean;
        __HS_SUPPRESS_EXPORT_ONCE?: boolean;
        __HS_DIALOG_HOOK_PATCHED?: boolean;
        __HS_SAVE_IMPORT_HOOK_PATCHED?: boolean;
        __HS_HEADER_MODULES_PATCHED?: boolean;
        __HS_GLOBAL_EVENT_PATCHED?: boolean;
        __HS_synergismStage?: (mode: number) => string;
        __HS_getMaxChallenges?: (challenge: number) => number;
        __HS_validateBlueberryTree?: (tree: unknown) => boolean;
        __HS_exportSynergism?: () => Promise<void>;
        __HS_tackHooks?: Array<() => void>;
        __HS_onAfterTack?: (callback: () => void) => void;
        __HS_dialogOrigin?: (kind: HSDialogKind, firstArg?: unknown) => unknown;
        __HS_onDialog?: (kind: HSDialogKind, origin: unknown) => { value: unknown } | undefined;
        __HS_onSaveImport?: (reset: unknown) => void;
        __HS_runManualAscension?: (reset: () => void) => void;
        __HS_headerModuleUnlocks?: Record<string, () => boolean>;
        __HS_beforeHeaderRender?: () => void;
        __HS_HEADER_CHALLENGE_SIZE_PATCHED?: boolean;
        __HS_compactChallengeText?: boolean;
        __HS_HEADER_BUTTONS_PATCHED?: boolean;
        __HS_headerButtonCapacity?: (defaultCapacity: number) => number;
        __HS_canJoinHeaderButtons?: (slot: readonly string[], id: string) => boolean | undefined;
        __HS_moveHeaderButton?: (layout: HSHeaderButtonLayout, id: string, region: string, target: HSHeaderButtonDropTarget) => boolean;
        __HS_HEADER_LONG_PRESS_PATCHED?: boolean;
        __HS_headerLongPressEnabled?: boolean;
        __HS_renderHeaderLayout?: () => void;
        __HS_parseSave?: (text: string) => Record<string, unknown> | null;
        __HS_stripHeaderModules?: <T>(player: T) => T;
        __HS_consumables?: Partial<ConsumableGameEvents>;
        // The game's own Decimals, read through parseGameDataDecimal. fragmentsInvested: only before game commit 075dfeaa
        __HS_talismans?: Readonly<Record<TalismanKeys, { readonly level: number; readonly fragmentsInvested?: Readonly<TalismanShards> }>>;
        __HS_globalEvent?: unknown;
        __HS_onGlobalEvent?: (event: unknown) => void;
        __HS_pcoinLevels?: Partial<Record<PseudoCoinUpgradeNames, number>>;
        __HS_pcoinLevelsLoaded?: boolean;
        __HS_onPCoinChange?: () => void;
        __HS_quarkBonus?: { personal: number; global: number };
        __HS_onQuarkBonusChange?: () => void;
        __HS_i18next?: {
            language: string;
            t: (key: string, vars?: Record<string, string | number>) => unknown;
            getResourceBundle: (language: string, namespace: string) => Record<string, unknown> | undefined;
        };
    }
}
