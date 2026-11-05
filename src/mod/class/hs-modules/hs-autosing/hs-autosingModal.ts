import { HSSettings } from "../../hs-core/settings/hs-settings";
import { HSModuleManager } from "../../hs-core/module/hs-module-manager";
import { HSGameDataAPI } from "../../hs-core/gds/hs-gamedata-api";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSAutosingStrategy, type HSAutosingExposureParts } from "../../../types/module-types/hs-autosing-types";
import { HSAutosing } from "./hs-autosing";
import { createPhaseRowDom, updatePhaseRowDom, getPhaseStats, PhaseHistoryEntry, PhaseRowDom } from "./hs-autosingPhaseStats";
import { SparklineDom, SparklineMetric, buildSparklineDom, updateSparkline } from './hs-autosingSparkline';
import Decimal from "break_infinity.js";
import { formatNumber, formatNumberWithSign, formatDecimal, formatTotalTime } from "./hs-autosingFormatUtils";
import { getAvgAndStdLast, getLogC15Std } from "./hs-autosingStatsUtils";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSAutosingStepTimingsWindow } from "./ui/hs-autosing-step-timings-window";

// =============================
// Class Properties and Fields
// =============================

/**
 * Class: HSAutosingModal
 * IsExplicitHSModule: No
 * Description: Modal for autosing timer and quark/golden quark gain tracking.
 *   - Handles UI orchestration, DOM caching, batching updates, and chart/stat rendering.
 *   - Integrates modular helpers for phase stats and charting.
 *   - Maintains unified metrics with running averages for time, quarks, and golden quarks.
 *
 * Author: XxmolkxX, Shewchou
 */
export class HSAutosingModal {
    static readonly #MIN_RENDER_INTERVAL_MS = 100;
    #context = 'HSAutosingModal';
    #modalMode: 'running' | 'review' = 'running';
    // --- DOM Elements & UI State ---
    #timerDisplay: HTMLDivElement | null = null;
    #timerHeader: HTMLDivElement | null = null;
    #timerContent: HTMLDivElement | null = null;
    #dynamicContent: HTMLDivElement | null = null;
    #stepTimingsBtn!: HTMLButtonElement;
    #chartToggleBtn: HTMLButtonElement | null = null;
    #minimizeBtn!: HTMLButtonElement;
    #pauseBtn!: HTMLButtonElement;
    #stopButton!: HTMLButtonElement;
    #restartButton!: HTMLButtonElement;
    #finishStopBtn!: HTMLButtonElement;
    #isVisible: boolean = false;
    #isMinimized: boolean = false;
    #isPaused: boolean = false;
    #isDragging: boolean = false;
    #isResizing: boolean = false;
    #dragOffset = { x: 0, y: 0 };
    #resizeStart = { width: 0, height: 0, x: 0, y: 0 };
    #dragBounds = { width: 0, height: 0, maxX: 0, maxY: 0 };

    // --- Cached DOM Nodes ---
    #phaseNameSpan: HTMLElement | null = null;
    #singTargetSpan: HTMLElement | null = null;
    #singHighestSpan: HTMLElement | null = null;
    #completedSingAmountSpan: HTMLElement | null = null;
    #completedSingHHPercentSpan: HTMLElement | null = null;
    #c15TopSpan: HTMLElement | null = null;
    #c15SigmaSpan: HTMLElement | null = null;
    #quarksCurrentAmountSpan: HTMLElement | null = null;
    #quarksRateValSpan: HTMLElement | null = null;
    #quarksRateHrSpan: HTMLElement | null = null;
    #quarksAntsShareSpan: HTMLElement | null = null;
    #gquarksCurrentAmountSpan: HTMLElement | null = null;
    #gquarksRateValSpan: HTMLElement | null = null;
    #gquarksRateHrSpan: HTMLElement | null = null;
    #avg1Span: HTMLElement | null = null;
    #avg10Span: HTMLElement | null = null;
    #avg50Span: HTMLElement | null = null;
    #avgAllSpan: HTMLElement | null = null;
    #avgAllCountSpan: HTMLElement | null = null;
    #totalTimeSpan: HTMLElement | null = null;
    #maxTimeSpan: HTMLElement | null = null;
    #minTimeSpan: HTMLElement | null = null;
    #quarksTotalGainsSpan: HTMLElement | null = null;
    #quarksMaxGainsSpan: HTMLElement | null = null;
    #quarksMinGainsSpan: HTMLElement | null = null;
    #gquarksTotalGainsSpan: HTMLElement | null = null;
    #gquarksMaxGainsSpan: HTMLElement | null = null;
    #gquarksMinGainsSpan: HTMLElement | null = null;
    #phaseStatsContainer: HTMLElement | null = null;
    #phaseRowMap: Map<string, PhaseRowDom> = new Map();
    #sparklineQuarksContainer: HTMLElement | null = null;
    #sparklineGoldenQuarksContainer: HTMLElement | null = null;
    #sparklineTimeContainer: HTMLElement | null = null;
    #avgSpanParts: Map<HTMLElement, { main: HTMLSpanElement; sd: HTMLSpanElement }> = new Map();
    #cachedDetailedEls: HTMLElement[] = [];
    #sectionGrids: HTMLElement[] = [];
    #farmingGrid: HTMLElement | null = null;

    // --- Data & State ---
    #showDetailedData: boolean = true;
    // This run records its step timings
    #hasStepTimings: boolean = false;
    #strategy: any = null;
    #strategyName: string = '';
    #loadoutsOrder: string[] = [];
    #modVersion: string = '';
    #singTarget: number = 0;
    #singHighest: number = 0;
    #singularityCount: number = 0;
    #lastSingularityTimestamp: number = 0;
    #currentPhaseName: string = '';
    #currentPhaseStart: number = 0;
    #lastRecordedPhaseName: string | null = null;
    #liveTimerInterval: number | null = null;

    // --- All-Time Statistical Summary ---
    #allTimeStats = {
        singCompleted: 0,
        singCompletedWithHappyHour: 0,
        totalDuration: 0,
        meanDuration: 0,
        sumSqDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        totalQuarks: 0,
        minQuarks: Infinity,
        maxQuarks: 0,
        totalQuarksFromAnts: 0,
        totalQuarksEarned: 0,
        totalGoldenQuarks: 0,
        minGoldenQuarks: Infinity,
        maxGoldenQuarks: 0
    };

    // --- Unified array for chart metrics: each entry represents a singularity event.
    #singularityMetrics: SparklineMetric[] = []; 

    // --- Charting & Stats ---
    #sparklineMaxPoints: number = 50;
    // Running sums for singularityMetrics to avoid O(n) reduces in addSingularityMetric
    #metricsSumDuration: number = 0;
    #metricsSumQuarks: number = 0;
    #metricsSumGoldenQuarks: number = 0;
    #phaseHistory: Map<string, PhaseHistoryEntry> = new Map();
    static readonly #DECIMAL_0 = new Decimal(0);
    #logC15Count: number = 0;
    #logC15Mean: number = 0;
    #logC15M2: number = 0;
    #latestQuarksTotal: number = 0;
    #latestGoldenQuarksTotal: number = 0;
    #sparklineQuarks: SparklineDom | null = null;
    #sparklineGoldenQuarks: SparklineDom | null = null;
    #sparklineTimes: SparklineDom | null = null;
    // --- Footer DOM Spans (for version/strategy/loadouts info) ---
    #footerVersionSpan: HTMLElement | null = null;
    #footerStrategySpan: HTMLElement | null = null;
    #footerLoadoutsSpan: HTMLElement | null = null;
    #footerPatchSpan: HTMLElement | null = null;

    // --- Mouse Event Handlers (for drag/resize) ---
    #onMouseMoveHandler = (e: MouseEvent) => this.#onMouseMove(e);
    #onMouseUpHandler = () => this.#onMouseUp();

    // --- Cached/Computed Data ---
    #phaseRenderOrder: string[] = [];
    #cachedStrategyOrder: string[] = [];
    #cachedStrategyOrderIndex: Map<string, number> = new Map();

    // --- Render Batching & Change Tracking ---
    // These flags and version numbers ensure that expensive DOM updates only happen when needed.
    #renderPending: boolean              = false;
    #renderTimerId: number | null        = null;
    #renderAnimationFrameId: number | null = null;
    #lastRenderTimestamp: number         = 0;
    #renderSummaryStatsPending: boolean  = false;
    #renderDetailedStatsPending: boolean = false;
    #renderPhasesPending: boolean        = false;
    #renderPhaseNamePending: boolean     = false;
    #renderSparklinesPending: boolean    = false;

    // --- Sizing & Layout ---
    #autoResized: boolean = false;
    #computedMaxWidth: number | null = null; // px
    #computedGraphWidth: number | null = null; // px


    // =============================
    // Constructor and Initialization
    // =============================

    /** Construct the timer modal and initialize core state and DOM. */
    constructor() {
        this.#createTimerDisplay();
        this.#setupDragAndResize();
    }

    /** Create and initialize the timer modal display, including header, content, and controls.
     *  Cache DOM nodes for performance. */
    #createTimerDisplay(): void {
        this.#timerDisplay = document.createElement('div');
        this.#timerDisplay.id = 'hs-autosing-timer-display';
        this.#timerDisplay.classList.add('hs-hidden');
        // Contain the modal to limit layout/paint impact on the rest of the document.
        // This helps isolate style/layout calculations from the page.
        // Note: supported in modern browsers.
        this.#timerDisplay.style.contain = 'layout paint';

        // ----- HEADER -----
        this.#timerHeader = document.createElement('div');
        this.#timerHeader.className = 'hs-timer-header';

        const title = document.createElement('span');
        title.textContent = '⏱️ Autosing';
        title.className   = 'hs-timer-title';

        // Pause button
        this.#pauseBtn = document.createElement('button');
        this.#pauseBtn.id          = 'hs-timer-ctrl-pause';
        this.#pauseBtn.textContent = '⏸️';
        this.#pauseBtn.title       = "Pause Autosing";
        this.#pauseBtn.className   = 'hs-timer-ctrl-btn';
        this.#pauseBtn.onclick = () => {
            this.#isPaused = !this.#isPaused;
            this.#pauseBtn.textContent = this.#isPaused ? '▶️' : '⏸️';
            this.#pauseBtn.title = this.#isPaused ? 'Resume Autosing' : 'Pause Autosing';
        };
        // Restart button
        this.#restartButton = document.createElement('button');
        this.#restartButton.id          = 'hs-timer-ctrl-restart';
        this.#restartButton.textContent = '🔄';
        this.#restartButton.title       = "Restart Singularity from the beginning";
        this.#restartButton.className   = 'hs-timer-ctrl-btn';
        this.#restartButton.onclick = async () => {
            const autosingMod = HSModuleManager.getModule<HSAutosing>('HSAutosing');
            await autosingMod?.restartAutosing();
        };
        // Stop BUTTON
        this.#stopButton = document.createElement('button');
        this.#stopButton.id          = 'hs-timer-ctrl-stop';
        this.#stopButton.textContent = '🔴';
        this.#stopButton.title       = "Stop Autosing NOW";
        this.#stopButton.className   = 'hs-timer-ctrl-btn';
        this.#stopButton.onclick = () => {
            const autosingMod = HSModuleManager.getModule<HSAutosing>('HSAutosing');
            if (this.#modalMode === 'review') {
                autosingMod?.closeAutosingModalAfterReview();
            }
            else {
                autosingMod?.stopAutosing({ showReviewModal: true });
            }
        };
        // Finish & Stop BUTTON
        this.#finishStopBtn = document.createElement('button');
        this.#finishStopBtn.id          = 'hs-timer-ctrl-finish-stop';
        this.#finishStopBtn.textContent = '🟠';
        this.#finishStopBtn.title       = "Stop Autosing at the end of current Singularity";
        this.#finishStopBtn.className   = 'hs-timer-ctrl-btn';
        this.#finishStopBtn.onclick = () => {
            const autosingMod = HSModuleManager.getModule<HSAutosing>('HSAutosing');
            if (autosingMod) {
                const newState = !autosingMod.getStopAtSingularitysEnd();
                autosingMod.setStopAtSingularitysEnd(newState);
                this.#finishStopBtn.style.backgroundColor = newState ? '#ff9800' : '';
            }
        };
        // Step timings button
        this.#stepTimingsBtn = document.createElement('button');
        this.#stepTimingsBtn.id          = 'hs-timer-ctrl-step-timings';
        this.#stepTimingsBtn.textContent = '📋';
        this.#stepTimingsBtn.title       = "Step timings";
        this.#stepTimingsBtn.className   = 'hs-timer-ctrl-btn hs-timer-ctrl-btn-secondary';
        this.#stepTimingsBtn.onclick = () => {
            void HSAutosingStepTimingsWindow.open(
                () => ({ modVersion: this.#modVersion, loadouts: this.#loadoutsOrder }),
                this.#timerDisplay?.getBoundingClientRect()
            );
        };
        // Detailed data toggle button
        this.#chartToggleBtn = document.createElement('button');
        this.#chartToggleBtn.id          = 'hs-timer-ctrl-chart-toggle';
        this.#chartToggleBtn.textContent = '📊';
        this.#chartToggleBtn.title       = "Toggle Detailed Data Visibility";
        this.#chartToggleBtn.className   = 'hs-timer-ctrl-btn hs-timer-ctrl-btn-secondary';
        this.#chartToggleBtn.onclick = () => {
            this.#toggleDetailedDataVisibility(!this.#showDetailedData);
        };
        this.#chartToggleBtn.onmouseenter = () => {
            if (this.#showDetailedData)
                this.#chartToggleBtn!.textContent = '✖️';
        };
        this.#chartToggleBtn.onmouseleave = () => { this.#chartToggleBtn!.textContent = '📊'; };
        // Minimize button
        this.#minimizeBtn = document.createElement('button');
        this.#minimizeBtn.id          = 'hs-timer-ctrl-minimize';
        this.#minimizeBtn.textContent = '−';
        this.#minimizeBtn.title       = "Minimize";
        this.#minimizeBtn.className   = 'hs-timer-ctrl-btn hs-timer-ctrl-btn-secondary';
        this.#minimizeBtn.onclick = () => this.#toggleMinimize();

        this.#timerHeader.appendChild(title);
        this.#timerHeader.appendChild(document.createElement('div')); // Spacer

        const controls = document.createElement('div');
        controls.className = 'hs-timer-controls';
        controls.appendChild(this.#pauseBtn);
        controls.appendChild(this.#restartButton);
        controls.appendChild(this.#stopButton);
        controls.appendChild(this.#finishStopBtn);
        controls.appendChild(this.#stepTimingsBtn);
        controls.appendChild(this.#chartToggleBtn);
        controls.appendChild(this.#minimizeBtn);
        this.#timerHeader.appendChild(controls);
        this.#applyControlVisibility();

        // ----- CONTENT -----
        this.#timerContent = document.createElement('div');
        this.#timerContent.className = 'hs-scrollbar-themed';

        this.#dynamicContent = document.createElement('div');
        this.#dynamicContent.className = 'hs-timer-content';
        this.#dynamicContent.innerHTML = `
            <div class="hs-timer-section">
                <div id="hs-farming-grid">
                    <div class="hs-section-header-title">
                        FARMING
                        <span>
                            <span id="hs-sing-target"></span>
                            <span class="hs-sing-sep"> / </span>
                            <span id="hs-sing-highest"></span>
                        </span>
                    </div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-c15-top" class="hs-c15-top hs-secondary-data-style"></span></div>
                    <div class="hs-label-cell" id="hs-completed-sing-full-div">
                        <span class="hs-timer-label">Completed:</span>
                        <span id="hs-completed-sing-amount">0</span>
                        <span class="hs-value-cell hs-detailed-data hs-secondary-data-style">
                            <span id="hs-completed-sing-with-happy-hour-percent">(0.00%</span>
                            <span> \uD83D\uDD14)</span>
                        </span>
                    </div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-c15-sigma" class="hs-secondary-data-style"></span></div>
                </div>
                <div class="hs-info-line-phase hs-detailed-data"><span class="hs-timer-label">Phase:</span> <span id="hs-phase-name-val">&nbsp;</span> <span id="hs-phase-timer-val"></span></div>
            </div>

            <hr class="hs-timer-hr">

            <div class="hs-timer-section">
                <div class="hs-times-grid hs-section-grid">
                    <div class="hs-section-header-title hs-section-header-title-full">TIMES</div>
                    <div class="hs-label-cell"><span class="hs-timer-label">Last 1:</span></div>
                    <div class="hs-value-cell"><span id="hs-avg-1">-</span></div>
                    <div class="hs-label-cell hs-detailed-data"><span class="hs-timer-label hs-secondary-data-style">Total:</span></div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-total-time" class="hs-secondary-data-style">-</span></div>
                    <div class="hs-label-cell hs-detailed-data"><span id="hs-avg-10-lbl" class="hs-timer-label">Last 10:</span></div>
                    <div class="hs-value-cell hs-detailed-data">
                        <span id="hs-avg-10">
                            <span class="hs-avg-main"></span>
                            <span class="hs-avg-sd"></span>
                        </span>
                    </div>
                    <div class="hs-label-cell hs-detailed-data"><span class="hs-timer-label hs-secondary-data-style">Max:</span></div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-max-time" class="hs-secondary-data-style">-</span></div>
                    <div class="hs-label-cell hs-detailed-data"><span id="hs-avg-50-lbl" class="hs-timer-label">Last 50:</span></div>
                    <div class="hs-value-cell hs-detailed-data">
                        <span id="hs-avg-50">
                            <span class="hs-avg-main"></span>
                            <span class="hs-avg-sd"></span>
                        </span>
                    </div>
                    <div class="hs-label-cell hs-detailed-data"><span class="hs-timer-label hs-secondary-data-style">Min:</span></div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-min-time" class="hs-secondary-data-style">-</span></div>
                    <div class="hs-label-cell"><span id="hs-avg-all-lbl" class="hs-timer-label">All <span id="hs-avg-all-count">0</span>:</span></div>
                    <div class="hs-value-cell">
                        <span id="hs-avg-all">
                            <span class="hs-avg-main"></span>
                            <span class="hs-avg-sd"></span>
                        </span>
                    </div>
                    <div></div>
                    <div></div>
                </div>
                <div id="hs-sparkline-time-container" class="hs-sparkline-row hs-detailed-data"></div>
            </div>

            <hr class="hs-timer-hr">

            <div class="hs-timer-section">
                <div class="hs-section-grid">
                    <div class="hs-section-header-title-span2">QUARKS</div>
                    <div class="hs-label-cell hs-detailed-data"><span class="hs-timer-label hs-secondary-data-style">Current:</span></div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-quarks-current-amount" class="hs-secondary-data-style">0</span></div>
                    <div class="hs-label-cell"><span class="hs-timer-label">Rate:</span></div>
                    <div class="hs-value-cell"><span id="hs-quarks-rate-val" class="hs-quarks-rate-color">0/s</span> <span id="hs-quarks-rate-val-hr"> (0/hr)</span></div>
                    <div class="hs-label-cell hs-detailed-data"><span class="hs-timer-label hs-secondary-data-style">Max:</span></div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-quarks-max-gains" class="hs-secondary-data-style">-</span></div>
                    <div class="hs-label-cell"><span class="hs-timer-label">Gained:</span></div>
                    <div class="hs-value-cell"><span id="hs-quarks-total-gains" class="hs-quarks-rate-color">-</span> <span id="hs-quarks-ants-share"></span></div>
                    <div class="hs-label-cell hs-detailed-data"><span class="hs-timer-label hs-secondary-data-style">Min:</span></div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-quarks-min-gains" class="hs-secondary-data-style">-</span></div>
                </div>
                <div id="hs-sparkline-quarks-container" class="hs-sparkline-row hs-detailed-data"></div>
            </div>

            <hr class="hs-timer-hr">

            <div class="hs-timer-section">
                <div class="hs-section-grid">
                    <div class="hs-section-header-title-span2">GOLDEN QUARKS</div>
                    <div class="hs-label-cell hs-detailed-data"><span class="hs-timer-label hs-secondary-data-style">Current:</span></div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-gquarks-current-amount" class="hs-secondary-data-style">0</span></div>
                    <div class="hs-label-cell"><span class="hs-timer-label">Rate:</span></div>
                    <div class="hs-value-cell"><span id="hs-gquarks-rate-val" class="hs-gquarks-rate-color">0/s</span> <span id="hs-gquarks-rate-val-hr"> (0/hr)</span></div>
                    <div class="hs-label-cell hs-detailed-data"><span class="hs-timer-label hs-secondary-data-style">Max:</span></div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-gquarks-max-gains" class="hs-secondary-data-style">-</span></div>
                    <div class="hs-label-cell"><span class="hs-timer-label">Gained:</span></div>
                    <div class="hs-value-cell"><span id="hs-gquarks-total-gains" class="hs-gquarks-rate-color">-</span></div>
                    <div class="hs-label-cell hs-detailed-data"><span class="hs-timer-label hs-secondary-data-style">Min:</span></div>
                    <div class="hs-value-cell hs-detailed-data"><span id="hs-gquarks-min-gains" class="hs-secondary-data-style">-</span></div>
                </div>
                <div id="hs-sparkline-goldenquarks-container" class="hs-sparkline-row hs-detailed-data"></div>
            </div>

            <div id="hs-phase-stats-wrapper" class="hs-detailed-data">
                <hr class="hs-timer-hr">
                <div id="hs-phase-stats-section" class="hs-timer-section">
                    <div id="hs-phase-stats-container" class="hs-phase-stats-grid">
                        <div class="hs-phase-stats-header-title hs-phase-stats-row0">PHASE STATISTICS</div>
                        <div class="hs-phase-stats-header hs-phase-stats-row0">Loops</div>
                        <div class="hs-phase-stats-header hs-phase-stats-row0">Avg</div>
                        <div class="hs-phase-stats-header hs-phase-stats-row0">SD</div>
                        <div class="hs-phase-stats-header hs-phase-stats-row0">Last</div>
                    </div>
                </div>
                <hr class="hs-timer-hr">
            </div>

            <div id="hs-footer-section" class="hs-footer-info hs-timer-section hs-detailed-data">
                <div class="hs-info-line-detailed"><span class="hs-timer-label">Module Version: </span> <span id="hs-footer-version"></span><span id="hs-footer-patch"></span></div>
                <div class="hs-info-line-detailed"><span class="hs-timer-label">Active Strategy: </span> <span id="hs-footer-strategy"></span></div>
                <div class="hs-info-line-detailed hs-footer-loadouts"><span class="hs-timer-label">Amb Loadouts Order: </span> <span id="hs-footer-loadouts"></span></div>
            </div>
        `;
        this.#timerContent.appendChild(this.#dynamicContent);

        // ----- RESIZE HANDLE -----
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'hs-resize-handle';
        resizeHandle.onmousedown = (e) => this.#startResize(e);

        // ----- ASSEMBLE -----
        this.#timerDisplay.appendChild(this.#timerHeader);
        this.#timerDisplay.appendChild(this.#timerContent);
        this.#timerDisplay.appendChild(resizeHandle);
        document.body.appendChild(this.#timerDisplay);

        // Cache frequently updated nodes (avoid repeated getElementById during renders)
        this.#cachedDetailedEls   = Array.from(document.querySelectorAll('.hs-detailed-data')) as HTMLElement[];
        this.#sectionGrids        = Array.from(document.querySelectorAll('.hs-section-grid')) as HTMLElement[];
        this.#farmingGrid         = document.getElementById('hs-farming-grid');
        this.#phaseStatsContainer = document.getElementById('hs-phase-stats-container');

        this.#singTargetSpan  = document.getElementById('hs-sing-target');
        this.#singHighestSpan = document.getElementById('hs-sing-highest');
        this.#phaseNameSpan   = document.getElementById('hs-phase-name-val');
        this.#completedSingAmountSpan    = document.getElementById('hs-completed-sing-amount');
        this.#completedSingHHPercentSpan = document.getElementById('hs-completed-sing-with-happy-hour-percent');

        this.#c15TopSpan      = document.getElementById('hs-c15-top');
        this.#c15SigmaSpan    = document.getElementById('hs-c15-sigma');

        this.#totalTimeSpan   = document.getElementById('hs-total-time');
        this.#maxTimeSpan     = document.getElementById('hs-max-time');
        this.#minTimeSpan     = document.getElementById('hs-min-time');
        this.#avg1Span        = document.getElementById('hs-avg-1');
        this.#avg10Span       = document.getElementById('hs-avg-10');
        this.#avg50Span       = document.getElementById('hs-avg-50');
        this.#avgAllSpan      = document.getElementById('hs-avg-all');
        this.#avgAllCountSpan = document.getElementById('hs-avg-all-count');

        this.#quarksCurrentAmountSpan  = document.getElementById('hs-quarks-current-amount');
        this.#quarksRateValSpan        = document.getElementById('hs-quarks-rate-val');
        this.#quarksRateHrSpan         = document.getElementById('hs-quarks-rate-val-hr');
        this.#quarksTotalGainsSpan     = document.getElementById('hs-quarks-total-gains');
        this.#quarksAntsShareSpan      = document.getElementById('hs-quarks-ants-share');
        this.#quarksMaxGainsSpan       = document.getElementById('hs-quarks-max-gains');
        this.#quarksMinGainsSpan       = document.getElementById('hs-quarks-min-gains');
        this.#gquarksCurrentAmountSpan = document.getElementById('hs-gquarks-current-amount');
        this.#gquarksRateValSpan       = document.getElementById('hs-gquarks-rate-val');
        this.#gquarksRateHrSpan        = document.getElementById('hs-gquarks-rate-val-hr');
        this.#gquarksTotalGainsSpan    = document.getElementById('hs-gquarks-total-gains');
        this.#gquarksMaxGainsSpan      = document.getElementById('hs-gquarks-max-gains');
        this.#gquarksMinGainsSpan      = document.getElementById('hs-gquarks-min-gains');

        this.#sparklineQuarksContainer       = document.getElementById('hs-sparkline-quarks-container');
        this.#sparklineGoldenQuarksContainer = document.getElementById('hs-sparkline-goldenquarks-container');
        this.#sparklineTimeContainer         = document.getElementById('hs-sparkline-time-container');

        this.#sparklineTimes        = buildSparklineDom(this.#sparklineTimeContainer,         '#FF8A80', true,  'time');
        this.#sparklineQuarks       = buildSparklineDom(this.#sparklineQuarksContainer,       '#00BCD4', false, 'quarks');
        this.#sparklineGoldenQuarks = buildSparklineDom(this.#sparklineGoldenQuarksContainer, '#F1FA8C', false, 'goldenQuarks');

        this.#footerVersionSpan  = document.getElementById('hs-footer-version');
        this.#footerStrategySpan = document.getElementById('hs-footer-strategy');
        this.#footerLoadoutsSpan = document.getElementById('hs-footer-loadouts');
        this.#footerPatchSpan    = document.getElementById('hs-footer-patch');
    }

    /** Ensure the average span structure (main/sd) exists for a given element.
     *  Returns the created or cached structure. */
    #ensureAvgSpanStructure(el: HTMLElement | null): { main: HTMLSpanElement; sd: HTMLSpanElement } | null {
        if (!el) return null;
        const cached = this.#avgSpanParts.get(el);
        if (cached) return cached;

        el.textContent = '';
        const main = document.createElement('span');
        main.className = 'hs-avg-main';
        const sd = document.createElement('span');
        sd.className = 'hs-avg-sd';
        el.appendChild(main);
        el.appendChild(sd);
        const parts = { main, sd };
        this.#avgSpanParts.set(el, parts);
        return parts;
    }


    // =============================
    // Modal Controls (Visibility/Drag/Resize/Minimize)
    // =============================

    public enterRunningMode(): void {
        this.#modalMode = 'running';
        this.#applyControlVisibility();
    }

    public enterReviewMode(): void {
        this.#modalMode = 'review';
        this.#clearSingularityInterval();
        this.show();
        this.#applyControlVisibility();
        HSLogger.log('Entered review mode', this.#context);
    }

    #applyControlVisibility(): void {
        if (!this.#pauseBtn || !this.#restartButton || !this.#stopButton || !this.#finishStopBtn || !this.#chartToggleBtn) return;

        const isReview = this.#modalMode === 'review';

        this.#pauseBtn.classList.toggle('hs-hidden',       isReview || !this.#showDetailedData);
        this.#finishStopBtn.classList.toggle('hs-hidden',  isReview || this.#isMinimized || !this.#showDetailedData);
        this.#restartButton.classList.toggle('hs-hidden',  this.#isMinimized || !this.#showDetailedData);
        this.#chartToggleBtn.classList.toggle('hs-hidden', this.#isMinimized);
        this.#stepTimingsBtn.classList.toggle('hs-hidden', !this.#hasStepTimings || this.#isMinimized || !this.#showDetailedData);

        // In review mode, move the "close" button to the left so it doesn't change place
        this.#stopButton.style.order = isReview ? '-1' : '';

        this.#stopButton.textContent = isReview ? '✖️' : '🔴';
        this.#stopButton.title = isReview ? 'Close stats modal' : 'Stop Autosing NOW';
    }

    /** Compute and apply auto width and height for the modal and chart containers. */
    #computeAndApplyAutoWidth(): void {
        if (!this.#timerDisplay || this.#autoResized) return;

        // Hard-coded defaults (adjust as desired)
        const FIXED_WIDTH  = 350; // px

        // Sparkline SVG width: leave space for the label column on the right.
        const FIXED_GRAPH_WIDTH = 286; // px
        const LABELS_ESTIMATE   = 55; // px; right-side label column width (based on ~11 chars in a 9px monospaced font-size)

        // Respect viewport so the modal doesn't go off-screen by default.
        const appliedWidth  = Math.max(260, Math.min(FIXED_WIDTH,  window.innerWidth - 20));

        this.#computedMaxWidth  = appliedWidth;
        // Graph (SVG) width must fit inside the modal
        this.#computedGraphWidth = Math.max(120, Math.min(FIXED_GRAPH_WIDTH, appliedWidth - LABELS_ESTIMATE));

        this.#timerDisplay.style.width  = 'auto';
        this.#timerDisplay.style.height = 'auto';

        // Sparkline containers also use auto width to allow modal to auto-resize
        if (this.#sparklineTimeContainer)         this.#sparklineTimeContainer.style.width         = 'auto';
        if (this.#sparklineQuarksContainer)       this.#sparklineQuarksContainer.style.width       = 'auto';
        if (this.#sparklineGoldenQuarksContainer) this.#sparklineGoldenQuarksContainer.style.width = 'auto';

        this.#autoResized = true;
    }

    /** Sets up drag and resize handlers for the modal. */
    #setupDragAndResize(): void {
        if (!this.#timerHeader || !this.#timerDisplay) return;
        // Dragging
        this.#timerHeader.onmousedown = (e) => {
            if (e.target === this.#timerHeader || (e.target as HTMLElement).tagName === 'SPAN') {
                this.#startDrag(e);
            }
        };
        window.addEventListener('mousemove', this.#onMouseMoveHandler);
        window.addEventListener('mouseup',   this.#onMouseUpHandler);
    }

    /** Handles mouse move events for dragging and resizing. */
    #onMouseMove(e: MouseEvent): void {
        if (this.#isDragging)      this.#drag(e);
        else if (this.#isResizing) this.#resize(e);
    }

    /** Handles mouse up events to stop dragging or resizing. */
    #onMouseUp(): void {
        this.#isDragging = false;
        this.#isResizing = false;
    }

    /** Starts dragging the modal. */
    #startDrag(e: MouseEvent): void {
        if (!this.#timerDisplay) return;
        this.#isDragging = true;
        const rect = this.#timerDisplay.getBoundingClientRect();
        this.#dragOffset.x = e.clientX - rect.left;
        this.#dragOffset.y = e.clientY - rect.top;
        this.#dragBounds.width  = rect.width;
        this.#dragBounds.height = rect.height;
        this.#dragBounds.maxX = Math.max(0, window.innerWidth - rect.width);
        this.#dragBounds.maxY = Math.max(0, window.innerHeight - rect.height);
    }

    /** Updates modal position while dragging. */
    #drag(e: MouseEvent): void {
        if (!this.#timerDisplay || !this.#isDragging) return;

        const x = Math.min(Math.max(0, e.clientX - this.#dragOffset.x), this.#dragBounds.maxX);
        const y = Math.min(Math.max(0, e.clientY - this.#dragOffset.y), this.#dragBounds.maxY);

        this.#timerDisplay.style.left   = `${x}px`;
        this.#timerDisplay.style.top    = `${y}px`;
        this.#timerDisplay.style.right  = 'auto';
        this.#timerDisplay.style.bottom = 'auto';
    }

    /** Starts resizing the modal. */
    #startResize(e: MouseEvent): void {
        if (!this.#timerDisplay || this.#isMinimized) return;
        e.preventDefault();
        this.#isResizing = true;
        const rect = this.#timerDisplay.getBoundingClientRect();
        this.#resizeStart = {
            width:  rect.width,
            height: rect.height,
            x: e.clientX,
            y: e.clientY
        };
    }

    /** Updates modal size while resizing. */
    #resize(e: MouseEvent): void {
        if (!this.#timerDisplay || !this.#isResizing) return;

        const deltaX = e.clientX - this.#resizeStart.x;
        const deltaY = e.clientY - this.#resizeStart.y;

        const newWidth = Math.max(200, this.#resizeStart.width + deltaX);
        const newHeight = Math.max(80, this.#resizeStart.height + deltaY);

        // Clamp width to computed max if present (locks max width)
        const maxW = this.#computedMaxWidth || Infinity;
        const finalWidth = Math.min(newWidth, maxW + 20);

        this.#timerDisplay.style.width = `${finalWidth}px`;
        this.#timerDisplay.style.height = `${newHeight}px`;
    }

    /** Toggles modal minimize state using class toggling for visibility/layout. */
    #toggleMinimize(): void {
        if (!this.#timerContent || !this.#timerDisplay) return;

        this.#isMinimized = !this.#isMinimized;

        this.#timerDisplay.classList.add('hs-minimized');
        this.#timerContent.classList.toggle('hs-hidden', this.#isMinimized);
        this.#applyControlVisibility();

        if (this.#minimizeBtn)
            this.#minimizeBtn.textContent = this.#isMinimized ? '+' : '−';

        if (!this.#isMinimized) {
            this.#timerDisplay.classList.remove('hs-minimized');
            this.#rebuildDetailedDataDom();
        } else {
            this.#deleteDetailedDataDom();
        }

        this.#requestRenderAll();
    }

    /** Show or hide all detailed data elements based on visibility flag using the 'hs-detailed-data' class. */
    #toggleDetailedDataVisibility(visible: boolean): void {
        if (!this.#timerContent || !this.#timerDisplay) return;

        this.#showDetailedData = visible;

        this.#cachedDetailedEls.forEach(el => {
            el.classList.toggle('hs-hidden', !visible);
        });

        this.#farmingGrid?.classList.toggle('hs-grid-2col-auto-auto', visible);
        this.#farmingGrid?.classList.toggle('hs-grid-1col',          !visible);
        this.#sectionGrids.forEach(sectionGrid => {
            sectionGrid.classList.toggle('hs-grid-4col',           visible);
            sectionGrid.classList.toggle('hs-grid-2col-min-auto', !visible);
        });

        this.#applyControlVisibility();

        if (visible) this.#rebuildDetailedDataDom();
        else         this.#deleteDetailedDataDom();

        this.#requestRenderAll();
    }

    /** (Re)build the DOM structure for detailed data sections that can be toggled on/off */
    #rebuildDetailedDataDom(): void {
        // Sparklines
        this.#sparklineTimes        = buildSparklineDom(this.#sparklineTimeContainer,         '#FF8A80', true,  'time');
        this.#sparklineQuarks       = buildSparklineDom(this.#sparklineQuarksContainer,       '#00BCD4', false, 'quarks');
        this.#sparklineGoldenQuarks = buildSparklineDom(this.#sparklineGoldenQuarksContainer, '#F1FA8C', false, 'goldenQuarks');
    }

    /** Delete the DOM structure for detailed data sections that can be toggled on/off */
    #deleteDetailedDataDom(): void {
        // Delete all phase rows (except the 5 column headers)
        if (this.#phaseStatsContainer) {
            while (this.#phaseStatsContainer.children.length > 5) {
                this.#phaseStatsContainer.removeChild(this.#phaseStatsContainer.lastElementChild!);
            }
        }
        this.#phaseRowMap.clear();

        // Clear sparkline containers and release stale DOM references.
        if (this.#sparklineTimeContainer)         this.#sparklineTimeContainer.innerHTML         = '';
        if (this.#sparklineQuarksContainer)       this.#sparklineQuarksContainer.innerHTML       = '';
        if (this.#sparklineGoldenQuarksContainer) this.#sparklineGoldenQuarksContainer.innerHTML = '';
        this.#sparklineQuarks       = null;
        this.#sparklineGoldenQuarks = null;
        this.#sparklineTimes        = null;
    }


    // =============================
    // Session/Timer Management
    // =============================

    /** Start the live timer for a new singularity. Reset phase tracking and update UI. */
    #startNewSingTimer(): void {
        this.#clearSingularityInterval();
        this.#lastSingularityTimestamp = performance.now();
        this.#currentPhaseStart = this.#lastSingularityTimestamp;

        this.#lastRecordedPhaseName = null;
        this.#currentPhaseName = '';
    }

    /** Restarts the timer of the singularity in progress, without recording anything. */
    public restartSingularityTimer(): void {
        this.#startNewSingTimer();
    }

    /** Stop the live timer interval. */
    #clearSingularityInterval(): void {
        if (this.#liveTimerInterval !== null) {
            clearInterval(this.#liveTimerInterval);
            this.#liveTimerInterval = null;
        }
    }

    /** Start autosing session with given strategy and initial (g)quark values.
     *  Reset phase history and metrics. */
    public start(strategy: HSAutosingStrategy, initialQuarks: number = 0, initialGoldenQuarks: number = 0,
        exposureParts?: HSAutosingExposureParts): void {
        this.reset();
        this.#hasStepTimings = !!window.__HS_autosingTimings;
        this.enterRunningMode();

        HSLogger.log('start() called: reset complete, initializing run metadata', this.#context);
        this.#latestQuarksTotal = initialQuarks;
        this.#latestGoldenQuarksTotal = initialGoldenQuarks;

        // Cache info at start
        this.#modVersion    = HSGlobal.General.currentModVersion;
        this.#strategy      = strategy;
        this.#singTarget    = this.#getSingularityTarget();
        this.#singHighest   = this.#getSingularityHighest();
        this.#strategyName  = this.#getStrategyName();
        this.#loadoutsOrder = this.#getLoadoutsOrder();
        this.#cachedStrategyOrder = this.#strategy.strategy.map((p: { startPhase: string; endPhase: string }) => `${p.startPhase}-${p.endPhase}`);
        HSLogger.debug(() => `loadoutsOrder: ${JSON.stringify(this.#loadoutsOrder)}`, this.#context);
        HSLogger.debug(() => `cachedStrategyOrder: ${JSON.stringify(this.#cachedStrategyOrder)}`, this.#context);

        // Set static stats DOM fields once
        this.#setTextEl(this.#singTargetSpan,    `S${this.#singTarget}`);
        this.#setTextEl(this.#singHighestSpan,   `S${this.#singHighest}`);
        this.#setTextEl(this.#footerVersionSpan, `v${this.#modVersion}`);
        this.#setTextEl(this.#footerStrategySpan, this.#strategyName);
        this.#setTextEl(this.#footerLoadoutsSpan, this.#loadoutsOrder.join(', '));
        if (exposureParts) this.#showPatchState(exposureParts);

        // Ensure AOAG appears before the final 'end' phase in the timer ordering.
        // Some phases are recorded using the human-friendly AOAG_PHASE_NAME (override),
        // so include that name in the cached order directly just before the phase that ends with 'end'.
        const AOAG_NAME = 'AOAG Unlocked Phase';
        const finalIdx = this.#cachedStrategyOrder.findIndex(s => s.endsWith('-end'));
        if (finalIdx >= 0) {
            // Insert AOAG just before the final end-phase marker
            // But avoid duplicating if already present
            if (!this.#cachedStrategyOrder.includes(AOAG_NAME)) {
                this.#cachedStrategyOrder.splice(finalIdx, 0, AOAG_NAME);
                HSLogger.debug(() => `AOAG inserted at index ${finalIdx} in cachedStrategyOrder`, this.#context);
            }
        } else {
            // No explicit end phase found; append AOAG at the end if not present
            if (!this.#cachedStrategyOrder.includes(AOAG_NAME)) {
                this.#cachedStrategyOrder.push(AOAG_NAME);
                HSLogger.debug(() => 'AOAG appended to cachedStrategyOrder', this.#context);
            }
        }
        HSLogger.debug(() => `Final cachedStrategyOrder: ${JSON.stringify(this.#cachedStrategyOrder)}`, this.#context);

        this.#cachedStrategyOrderIndex.clear();
        for (let i = 0; i < this.#cachedStrategyOrder.length; i++) {
            this.#cachedStrategyOrderIndex.set(this.#cachedStrategyOrder[i], i);
        }

        this.#startNewSingTimer();
        this.#requestRenderAll();
    }

    /** Records the completion of a phase, updating phase history and current singularity tracking. */
    public recordPhase(phase: string): void {
        const now = performance.now();
        const phaseDuration = (now - this.#currentPhaseStart) / 1000;

        // MERGE LOGIC: Check if we are repeating the same phase
        let phaseData = this.#phaseHistory.get(phase);
        if (phase === this.#lastRecordedPhaseName && phaseData && phaseData.phaseCount > 0) {
            // Add the new duration chunk to the existing chunk
            const prev = phaseData.lastTime;
            const next = prev + phaseDuration;
            // Update stats directly
            phaseData.totalTime += phaseDuration;
            phaseData.sumSq     += (next * next) - (prev * prev);
            phaseData.lastTime  = next;
            phaseData.innerLoopCount++;
        } else {
            // STANDARD LOGIC: Next Phase
            if (!phaseData) {
                phaseData = { phaseCount: 0, totalTime: 0, sumSq: 0, lastTime: 0, innerLoopCount: 0 };
                this.#phaseHistory.set(phase, phaseData);
                this.#insertPhaseRenderName(phase);
            }
            phaseData.phaseCount += 1;
            phaseData.innerLoopCount += 1;
            phaseData.totalTime  += phaseDuration;
            phaseData.sumSq      += phaseDuration * phaseDuration;
            phaseData.lastTime   = phaseDuration;
            this.#lastRecordedPhaseName = phase;
        }

        // Prepare for next phase
        this.#currentPhaseStart = now;

        // Phase name is handled on his own
        this.#requestRender({ phases: true });
    }

    /** Records the completion of a singularity, updating metrics and stats.
     *  Stores running averages for duration, quarks, and golden quarks. */
    public recordSingularity(gainedGoldenQuarks: number, currentGoldenQuarks: number, gainedQuarks: number, currentQuarks: number, quarksFromAnts: number, quarksThisSingularity: number, happyHourStackAmount: number, c15Score?: Decimal): void {
        const now = performance.now();
        const singularityDuration = (now - this.#lastSingularityTimestamp) / 1000;
        this.#lastSingularityTimestamp = now;
        this.#singularityCount += 1;

        this.#latestGoldenQuarksTotal = currentGoldenQuarks;

        // Handle quarks exactly like golden quarks: use passed totals/gains.
        const realQuarksGain    = gainedQuarks;
        this.#latestQuarksTotal = currentQuarks;

        // Add to unified metrics array for charts
        this.#addSingularityMetric(singularityDuration, realQuarksGain, gainedGoldenQuarks);

        // --- Update all-time statistical summary (Welford's algorithm)
        this.#allTimeStats.singCompleted++;
        this.#allTimeStats.singCompletedWithHappyHour += happyHourStackAmount > 0 ? 1 : 0;
        // Duration
        const deltaDuration = singularityDuration - this.#allTimeStats.meanDuration;
        this.#allTimeStats.meanDuration  += deltaDuration / this.#allTimeStats.singCompleted;
        this.#allTimeStats.sumSqDuration += deltaDuration * (singularityDuration - this.#allTimeStats.meanDuration);
        this.#allTimeStats.totalDuration += singularityDuration;
        // Quarks
        this.#allTimeStats.totalQuarks += realQuarksGain;
        this.#allTimeStats.totalQuarksFromAnts += quarksFromAnts;
        this.#allTimeStats.totalQuarksEarned   += quarksThisSingularity;
        // Golden Quarks
        this.#allTimeStats.totalGoldenQuarks += gainedGoldenQuarks;
        // Min and Max
        this.#allTimeStats.minDuration     = Math.min(this.#allTimeStats.minDuration,     singularityDuration);
        this.#allTimeStats.maxDuration     = Math.max(this.#allTimeStats.maxDuration,     singularityDuration);
        this.#allTimeStats.minQuarks       = Math.min(this.#allTimeStats.minQuarks,       realQuarksGain);
        this.#allTimeStats.maxQuarks       = Math.max(this.#allTimeStats.maxQuarks,       realQuarksGain);
        this.#allTimeStats.minGoldenQuarks = Math.min(this.#allTimeStats.minGoldenQuarks, gainedGoldenQuarks);
        this.#allTimeStats.maxGoldenQuarks = Math.max(this.#allTimeStats.maxGoldenQuarks, gainedGoldenQuarks);

        // Online stats of ln(C15), Welford's algorithm: its mean gives the geometric mean shown, its spread σlog.
        // Read from the Decimal, a score can be out of a number's range. A score of 0 has no log: skipped.
        if (c15Score !== undefined && c15Score.gt(0)) {
            const logVal = c15Score.ln();
            if (Number.isFinite(logVal)) {
                const k     = this.#logC15Count + 1;
                const delta = logVal - this.#logC15Mean;
                this.#logC15Mean  += delta / k;
                this.#logC15M2    += delta * (logVal - this.#logC15Mean);
                this.#logC15Count = k;
            }
        }

        this.#startNewSingTimer();
        this.#requestRender({ summaryStats: true, detailedStats: true, sparklines: true });
    }


    // =============================
    // Data/Stat Management
    // =============================

    /** Adds a new entry to singularityMetrics for unified chart/stat logic. */
    #addSingularityMetric(
        singularityDuration: number,
        realQuarksGain: number,
        gainedGoldenQuarks: number
    ): void {
        // Prune oldest entry first if at capacity, subtracting its values from running sums
        if (this.#singularityMetrics.length >= this.#sparklineMaxPoints) {
            const removed = this.#singularityMetrics.shift()!;
            this.#metricsSumDuration     -= removed.duration;
            this.#metricsSumQuarks       -= removed.quarksGained;
            this.#metricsSumGoldenQuarks -= removed.goldenQuarksGained;
        }

        // Update running sums with the new entry
        this.#metricsSumDuration     += singularityDuration;
        this.#metricsSumQuarks       += realQuarksGain;
        this.#metricsSumGoldenQuarks += gainedGoldenQuarks;

        // Compute running averages from maintained sums (O(1) instead of O(n))
        const n = this.#singularityMetrics.length + 1;
        const runningAvgDuration = this.#metricsSumDuration / n;
        const totalDuration      = this.#metricsSumDuration;
        const runningAvgQuarksPerSecond       = totalDuration > 0 ? this.#metricsSumQuarks / totalDuration : 0;
        const runningAvgGoldenQuarksPerSecond = totalDuration > 0 ? this.#metricsSumGoldenQuarks / totalDuration : 0;

        this.#singularityMetrics.push({
            timestamp: performance.now(),
            duration: singularityDuration,
            quarksGained: realQuarksGain,
            goldenQuarksGained: gainedGoldenQuarks,
            runningAvgDuration,
            runningAvgQuarksPerSecond,
            runningAvgGoldenQuarksPerSecond
        });
    }


    // =============================
    // State Accessors
    // =============================

    /** Public setter to update the current phase name displayed on the timer.
     *  Call this at the START of a phase so the user sees what is happening. */
    public setCurrentPhase(phaseName: string) {
        if (this.#currentPhaseName !== phaseName) {
            this.#currentPhaseName = phaseName;
            this.#requestRender({ phaseName: true });
        }
    }

    /** Return true if autosing is currently paused. */
    public getIsPaused(): boolean {
        return this.#isPaused;
    }

    /** Return the target singularity number from settings. */
    #getSingularityTarget(): number {
        return Number(HSSettings.getSetting('singularityNumber').getValue()) || 0;
    }

    /** Return the highest singularity count from game data. */
    #getSingularityHighest(): number {
        const gameDataAPI = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');
        const gameData = gameDataAPI?.getGameData();
        return gameData?.highestSingularityCount ?? 0;
    }

    /** Return the name of the current autosing strategy from settings. */
    #getStrategyName(): string {
        const setting = HSSettings.getSetting('autosingStrategy');
        const value = setting.getValue();
        const definition = setting.getDefinition();
        const option = definition.settingControl?.selectOptions?.find(opt => String(opt.value) === String(value));
        return option ? option.text : String(value || 'None');
    }

    /** Update the footer's loadouts after "Don't switch ambrosia loadouts" changed during a run. */
    public refreshLoadouts(): void {
        this.#loadoutsOrder = this.#getLoadoutsOrder();
        this.#setTextEl(this.#footerLoadoutsSpan, this.#loadoutsOrder.join(', '));
    }

    /** Return the order of ambrosia loadouts for the session from settings. */
    #getLoadoutsOrder(): string[] {
        if (HSSettings.getSetting('autosingNoAmbrosiaSwitch').isEnabled()) return ['no switch'];
        return [
            String(HSSettings.getSetting('autosingEarlyCubeLoadout').getValue()).replace('Loadout ', ''),
            String(HSSettings.getSetting('autosingLateCubeLoadout').getValue()).replace('Loadout ', ''),
            String(HSSettings.getSetting('autosingQuarkLoadout').getValue()).replace('Loadout ', ''),
            String(HSSettings.getSetting('autosingObtLoadout').getValue()).replace('Loadout ', ''),
            String(HSSettings.getSetting('autosingOffLoadout').getValue()).replace('Loadout ', ''),
            String(HSSettings.getSetting('autosingAmbrosiaLoadout').getValue()).replace('Loadout ', '')
        ];
    }

    /** Return the duration (in seconds) of the last completed singularity. */
    #getLastDuration(): number | null {
        // Return the duration of the last entry in singularityMetrics
        if (this.#singularityMetrics.length === 0) return null;
        return this.#singularityMetrics[this.#singularityMetrics.length - 1].duration;
    }

    // --- All-Time Stats Helpers ---
    #getAllTimeAvgDuration(): number | null {
        return this.#allTimeStats.singCompleted     ? this.#allTimeStats.totalDuration / this.#allTimeStats.singCompleted                : null;
    }
    #getAllTimeStdDuration(): number | null {
        return this.#allTimeStats.singCompleted > 1 ? Math.sqrt(this.#allTimeStats.sumSqDuration / this.#allTimeStats.singCompleted)     : null;
    }


    // =============================
    // Render Methods
    // =============================

    /** Request a full render update for all modal sections. */
    #requestRenderAll(): void {
        this.#requestRender({ summaryStats: true, detailedStats: true, phases: true, phaseName: true, sparklines: true });
    }

    /** Request a render update for specific modal sections. Data stays current,
     * while DOM work is coalesced and rate-limited so it cannot compete with AutoSing. */
    #requestRender(opts: { summaryStats?: boolean; detailedStats?: boolean; phases?: boolean; phaseName?: boolean; sparklines?: boolean } = {}): void {
        if (this.#isMinimized) return;
        if (opts.summaryStats)  this.#renderSummaryStatsPending  = true;
        if (opts.detailedStats) this.#renderDetailedStatsPending = true;
        if (opts.phases)        this.#renderPhasesPending        = true;
        if (opts.phaseName)     this.#renderPhaseNamePending     = true;
        if (opts.sparklines)    this.#renderSparklinesPending    = true;

        if (this.#renderPending) return;
        this.#renderPending = true;

        const scheduleAnimationFrame = (): void => {
            this.#renderTimerId = null;
            this.#renderAnimationFrameId = window.requestAnimationFrame(() => {
                this.#renderAnimationFrameId = null;
                this.#renderPending = false;
                this.#lastRenderTimestamp = performance.now();
                this.#flushRender();
            });
        };

        const elapsed = performance.now() - this.#lastRenderTimestamp;
        const remaining = HSAutosingModal.#MIN_RENDER_INTERVAL_MS - elapsed;
        if (remaining > 0) {
            this.#renderTimerId = window.setTimeout(scheduleAnimationFrame, remaining);
        } else {
            scheduleAnimationFrame();
        }
    }

    /** Execute pending render updates for modal sections. Only runs if modal is visible and DOM is ready. */
    #flushRender(): void {
        if (!this.#timerDisplay || !this.#timerContent || !this.#isVisible || this.#isMinimized) {
            this.#renderSummaryStatsPending  = false; // Every sing
            this.#renderDetailedStatsPending = false; // Every sing (if detailed data is visible)
            this.#renderPhasesPending        = false; // Every phase END
            this.#renderPhaseNamePending     = false; // Every phase START
            this.#renderSparklinesPending    = false; // Every sing
            return;
        }

        if (this.#renderSummaryStatsPending) {
            this.#renderSummaryStats();
            this.#renderSummaryStatsPending = false;
        }
        if (this.#renderDetailedStatsPending) {
            this.#renderDetailedStats();
            this.#renderDetailedStatsPending = false;
        }
        if (this.#renderPhasesPending) {
            this.#renderPhaseStatistics();
            this.#renderPhasesPending = false;
        }
        if (this.#renderPhaseNamePending) {
            this.#setTextEl(this.#phaseNameSpan, this.#currentPhaseName);
            this.#renderPhaseNamePending  = false;
        }
        if (this.#renderSparklinesPending) {
            this.#renderSparklines();
            this.#renderSparklinesPending = false;
        }
    }

    /**
     * The footer's patch state: "slow" when a fast path lacks what it reads and falls back to the DOM, "not patched"
     * when nothing was found (bookmarklet). The list is the span's tooltip, set once per start.
     */
    #showPatchState(parts: HSAutosingExposureParts): void {
        const el = this.#footerPatchSpan;
        if (!el) return;
        const fastPaths = Object.values(parts.fastPaths);
        const all = [...fastPaths, ...Object.values(parts.other)];
        const isSlow = !fastPaths.every(Boolean);
        const text = !all.some(Boolean) ? 'Not patched · slow'
            : all.every(Boolean) ? 'Patched'
            : isSlow ? 'Patch incomplete · slow' : 'Patch incomplete';
        this.#setTextEl(el, text);
        el.classList.toggle('hs-footer-patch-slow', isSlow);
        el.title = Object.entries({ ...parts.fastPaths, ...parts.other })
            .map(([label, found]) => `${label}: ${found}`)
            .join('\n');
    }

    /** Set the text content of an element if it differs from the current value. */
    #setTextEl(el: HTMLElement | null, text: string): void {
        if (!el) return;
        if (el.textContent !== text) el.textContent = text;
    }

    /** Set the average and standard deviation display for a span element, 
     *  using stateless helpers for formatting. */
    #setAvgEl(el: HTMLElement | null, val: number | null, sd: number | null): void {
        if (!el) return;
        const parts = this.#ensureAvgSpanStructure(el);
        if (!parts) return;

        if (val === null) {
            if (parts.main.textContent !== '-') parts.main.textContent = '-';
            if (parts.sd.textContent   !== '')  parts.sd.textContent = '';
            return;
        }

        const mainText = `${val.toFixed(2)}s`;
        const sdText = sd !== null ? ` (σ ±${sd.toFixed(2)}s)` : '';
        if (parts.main.textContent !== mainText) parts.main.textContent = mainText;
        if (parts.sd.textContent   !== sdText)   parts.sd.textContent = sdText;
    }

    #insertPhaseRenderName(phaseName: string): void {
        if (this.#phaseRowMap.has(phaseName)) return;

        const getOrderIndex = (name: string): number => this.#cachedStrategyOrderIndex.get(name) ?? 999;
        const phaseIndex = getOrderIndex(phaseName);
        const insertAt = this.#phaseRenderOrder.findIndex(existingPhase => getOrderIndex(existingPhase) > phaseIndex);

        if (insertAt === -1) {
            this.#phaseRenderOrder.push(phaseName);
        } else {
            this.#phaseRenderOrder.splice(insertAt, 0, phaseName);
        }
    }

    /** Render summary statistics (fields staying visible even if detailed data visibility is OFF). */
    #renderSummaryStats(): void {
        if (this.#isMinimized) return;

        const singCompleted       = this.#allTimeStats.singCompleted;
        const singCompletedWithHH = this.#allTimeStats.singCompletedWithHappyHour;

        const avg1   = this.#getLastDuration();
        const avgAll = this.#getAllTimeAvgDuration();
        const sdAll  = this.#getAllTimeStdDuration();

        const allTimeDuration           = this.#allTimeStats.totalDuration;
        const allTimeQuarks             = this.#allTimeStats.totalQuarks;
        const allTimeQuarksPerSec       = allTimeDuration > 0 ? allTimeQuarks / allTimeDuration : 0;
        const allTimeGoldenQuarks       = this.#allTimeStats.totalGoldenQuarks;
        const allTimeGoldenQuarksPerSec = allTimeDuration > 0 ? allTimeGoldenQuarks / allTimeDuration : 0;
        const antsSharePercent          = 100 * this.#allTimeStats.totalQuarksFromAnts / this.#allTimeStats.totalQuarksEarned;

        // Farming section
        this.#setTextEl(this.#completedSingAmountSpan, singCompleted ? `${singCompleted}` : '-');
        this.#setTextEl(this.#completedSingHHPercentSpan, singCompleted > 0 && singCompletedWithHH > 0
            ? `(${((singCompletedWithHH / singCompleted) * 100).toFixed(2)}%`
            : '(0.00%');

        // Times section
        this.#setTextEl(this.#avg1Span,        avg1 !== null ? `${avg1.toFixed(2)}s` : '-');
        this.#setTextEl(this.#avgAllCountSpan, singCompleted ? `${singCompleted}` : '-');
        this.#setAvgEl( this.#avgAllSpan,      avgAll, sdAll);

        // Quarks section
        this.#setTextEl(this.#quarksRateValSpan,    `${formatNumber(allTimeQuarksPerSec)}/s`);
        this.#setTextEl(this.#quarksRateHrSpan,     `(${formatNumber(allTimeQuarksPerSec * 3600)}/hr)`);
        this.#setTextEl(this.#quarksTotalGainsSpan, allTimeQuarks > 0 ? formatNumber(allTimeQuarks) : '-');
        this.#setTextEl(this.#quarksAntsShareSpan,  Number.isFinite(antsSharePercent) ? `(${antsSharePercent.toFixed(2)}% ants)` : '');
        if (this.#quarksAntsShareSpan) this.#quarksAntsShareSpan.title = `Quarks earned during this run from the Ants to Quark Corner: ${formatNumber(this.#allTimeStats.totalQuarksFromAnts)}`;

        // Golden Quarks section
        this.#setTextEl(this.#gquarksRateValSpan,    `${formatNumber(allTimeGoldenQuarksPerSec)}/s`);
        this.#setTextEl(this.#gquarksRateHrSpan,     `(${formatNumber(allTimeGoldenQuarksPerSec * 3600)}/hr)`);
        this.#setTextEl(this.#gquarksTotalGainsSpan, allTimeGoldenQuarks > 0 ? formatNumber(allTimeGoldenQuarks) : '-');
    }

    /** Render detailed statistics (fields only visible when detailed data visibility is ON) */
    #renderDetailedStats(): void {
        if (this.#isMinimized || !this.#showDetailedData) return;

        const sdLogC15 = getLogC15Std(this.#logC15Count, this.#logC15M2);

        const stats10 = getAvgAndStdLast(this.#singularityMetrics, 10);
        const stats50 = getAvgAndStdLast(this.#singularityMetrics, 50);

        const totalTime = this.#allTimeStats.totalDuration;
        const maxTime   = this.#allTimeStats.maxDuration;
        const minTime   = this.#allTimeStats.minDuration;
        const currentQuarks  = this.#latestQuarksTotal;
        const maxQuarksGains = this.#allTimeStats.maxQuarks;
        const minQuarksGains = this.#allTimeStats.minQuarks;
        const currentGoldenQuarks  = this.#latestGoldenQuarksTotal;
        const maxGoldenQuarksGains = this.#allTimeStats.maxGoldenQuarks;
        const minGoldenQuarksGains = this.#allTimeStats.minGoldenQuarks;

        // Farming section
        this.#setTextEl(this.#c15TopSpan,    `C15 ${formatDecimal(this.#logC15Count > 0 ? Decimal.exp(this.#logC15Mean) : HSAutosingModal.#DECIMAL_0)}`);
        this.#setTextEl(this.#c15SigmaSpan,  sdLogC15 !== null ? `(σlog ±${sdLogC15.toFixed(3)})` : '');

        // Times section
        this.#setAvgEl(this.#avg10Span,      stats10.avg, stats10.sd);
        this.#setAvgEl(this.#avg50Span,      stats50.avg, stats50.sd);
        this.#setTextEl(this.#totalTimeSpan, totalTime > 0                         ? formatTotalTime(totalTime) : '-');
        this.#setTextEl(this.#maxTimeSpan,   maxTime !== 0                         ? `${maxTime.toFixed(2)}s`   : '-');
        this.#setTextEl(this.#minTimeSpan,   minTime !== 0 && minTime !== Infinity ? `${minTime.toFixed(2)}s`   : '-');

        // Quarks section
        this.#setTextEl(this.#quarksCurrentAmountSpan, currentQuarks  !== 0                                ? formatNumber(currentQuarks)  : '-');
        this.#setTextEl(this.#quarksMaxGainsSpan,      maxQuarksGains !== 0                                ? formatNumber(maxQuarksGains) : '-');
        this.#setTextEl(this.#quarksMinGainsSpan,      minQuarksGains !== 0 && minQuarksGains !== Infinity ? formatNumber(minQuarksGains) : '-');

        // Golden Quarks section
        this.#setTextEl(this.#gquarksCurrentAmountSpan, currentGoldenQuarks  > 0                                        ? formatNumber(currentGoldenQuarks)  : '-');
        this.#setTextEl(this.#gquarksMaxGainsSpan,      maxGoldenQuarksGains !== 0                                      ? formatNumber(maxGoldenQuarksGains) : '-');
        this.#setTextEl(this.#gquarksMinGainsSpan,      minGoldenQuarksGains !== 0 && minGoldenQuarksGains !== Infinity ? formatNumber(minGoldenQuarksGains) : '-');
    }

    /** Render the phase statistics table, sorting and displaying phase data using stateless helpers. */
    #renderPhaseStatistics(): void {
        if (!this.#phaseStatsContainer || !this.#showDetailedData) return;

        // --- Row management ---
        // Only update/insert rows as needed; do not remove rows except when hiding all
        let domChildIdx = 5; // skip header (first 5 children)
        for (const phaseName of this.#phaseRenderOrder) {
            const phaseData = this.#phaseHistory.get(phaseName);
            if (!phaseData) continue;
            const stats = getPhaseStats(this.#phaseHistory, phaseName);
            const rowStats = {
                ...stats,
                phaseName
            };
            let rowDom = this.#phaseRowMap.get(phaseName);
            if (!rowDom) {
                rowDom = createPhaseRowDom(phaseName, phaseData.phaseCount);
                updatePhaseRowDom(rowDom, rowStats);
                this.#phaseRowMap.set(phaseName, rowDom);

                const fragment = document.createDocumentFragment();
                rowDom.cells.forEach(cell => fragment.appendChild(cell));
                this.#phaseStatsContainer!.insertBefore(fragment, this.#phaseStatsContainer!.children[domChildIdx] || null);
            } else {
                updatePhaseRowDom(rowDom, rowStats);
            }
            domChildIdx += 5;
        }
    }

    /** Render sparkline charts for quarks, golden quarks, and times,
      * and updates average/stat displays using stateless helpers. */
    #renderSparklines(): void {
        // Only render sparklines if detailed data is enabled
        if (this.#showDetailedData) {
            updateSparkline(this.#sparklineTimes,        this.#singularityMetrics, this.#computedGraphWidth, formatNumberWithSign, this.#sparklineMaxPoints);
            updateSparkline(this.#sparklineQuarks,       this.#singularityMetrics, this.#computedGraphWidth, formatNumberWithSign, this.#sparklineMaxPoints);
            updateSparkline(this.#sparklineGoldenQuarks, this.#singularityMetrics, this.#computedGraphWidth, formatNumberWithSign, this.#sparklineMaxPoints);
        }
    }


    // =============================
    // Misc Modal Stuff
    // =============================

    /** Show the modal. Computes and applies width on first open, then displays the modal. */
    public show(): void {
        if (!this.#timerDisplay) return;

        // On first open, compute and apply an appropriate width so that
        // every strategy phase fits on a single line and graphs match.
        if (!this.#autoResized) this.#computeAndApplyAutoWidth();

        this.#timerDisplay.classList.remove('hs-hidden');
        this.#isVisible = true;
    }

    /** Reset all modal state, stats, and phase history. Stops timer and triggers a full render. */
    public reset(): void {
        this.#singularityCount = 0;
        this.#lastSingularityTimestamp = 0;
        this.#singularityMetrics = [];
        this.#metricsSumDuration = 0;
        this.#metricsSumQuarks = 0;
        this.#metricsSumGoldenQuarks = 0;
        this.#phaseHistory.clear();
        this.#phaseRowMap.clear();
        this.#phaseRenderOrder = [];
        this.#allTimeStats = {
            singCompleted: 0,
            singCompletedWithHappyHour: 0,
            totalDuration: 0,
            meanDuration: 0,
            sumSqDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
            totalQuarks: 0,
            minQuarks: Infinity,
            maxQuarks: 0,
            totalQuarksFromAnts: 0,
            totalQuarksEarned: 0,
            totalGoldenQuarks: 0,
            minGoldenQuarks: Infinity,
            maxGoldenQuarks: 0
        };
        this.#logC15Count = 0;
        this.#logC15Mean = 0;
        this.#logC15M2 = 0;
        this.#latestQuarksTotal = 0;
        this.#latestGoldenQuarksTotal = 0;
        this.#lastRecordedPhaseName = null;
        this.#currentPhaseName = '';
        this.#clearSingularityInterval();
        this.#requestRenderAll();
    }

    /** Destroy the modal, remove event listeners, and clean up DOM elements. */
    public destroy(): void {
        HSAutosingStepTimingsWindow.close();
        this.#clearSingularityInterval();
        if (this.#renderTimerId !== null) {
            window.clearTimeout(this.#renderTimerId);
            this.#renderTimerId = null;
        }
        if (this.#renderAnimationFrameId !== null) {
            window.cancelAnimationFrame(this.#renderAnimationFrameId);
            this.#renderAnimationFrameId = null;
        }
        this.#renderPending = false;
        window.removeEventListener('mousemove', this.#onMouseMoveHandler);
        window.removeEventListener('mouseup', this.#onMouseUpHandler);
        // Remove drag/resize handlers from timerHeader
        if (this.#timerHeader) this.#timerHeader.onmousedown = null;

        // Remove resize handle event
        const resizeHandle = this.#timerDisplay?.querySelector('.hs-resize-handle');
        if (resizeHandle)
            resizeHandle.removeEventListener('mousedown', this.#startResize as any);
        if (this.#timerDisplay && this.#timerDisplay.parentNode)
            this.#timerDisplay.parentNode.removeChild(this.#timerDisplay);
        this.#timerDisplay = null;
        this.#timerHeader  = null;
    }
}
