import { HSUI } from "../../../hs-core/hs-ui";

export class HSHeaterUIStyles {
    static #heaterStylesInjected = false;

    static getHeaterBaseStylesCss(): string {
        return `
            .hs-heater-inputs-body .hs-panel-btn {
                width: auto;
            }

            /* === Modal Layout === */
            .hs-modal-body.hs-heater-inputs-body {
                display: flex;
                gap: 14px;
                align-items: stretch;
                min-height: 0;
                overflow: hidden;
            }

            #hs-heater-inputs-body-left {
                flex: 1 1 auto;
                min-width: 100px;
                min-height: 0;
                max-height: 100%;
                overflow-y: auto;
            }

            #hs-heater-inputs-body-right {
                flex: 0 0 auto;
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-height: 0;
                max-height: 100%;
                overflow-y: auto;
                padding-right: 6px;
            }

            /* Start Heater, with the cancel button on its right while a heat runs */
            .hs-heater-start-row {
                display: flex;
                gap: 4px;
            }

            /* Full width, less the cancel button when it is shown */
            #hs-heater-recalculate-btn {
                flex: 1 1 auto;
                min-width: 0;
            }

            #hs-heater-cancel-btn {
                width: 30px;
                flex: 0 0 auto;
            }

            #hs-heater-cancel-btn[hidden] {
                display: none;
            }

            .hs-heater-workers {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 0px 8px;
                /* Close to the heat button: the column's 6px gap less 2 */
                margin-top: -2px;
                color: #bbb;
                cursor: help;
            }

            /* Shows there is a tooltip: a circle like the results' type info trigger */
            .hs-heater-workers-help {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 16px;
                width: 16px;
                height: 16px;
                box-sizing: border-box;
                border: 1px solid rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                color: #9a9a9a;
                font-size: 11px;
                font-weight: bold;
                line-height: 1;
                user-select: none;
            }

            .hs-heater-workers[hidden] {
                display: none;
            }

            /* Same look as the "Your Loadout Order" dropdowns, in the heat button's red */
            .hs-heater-workers select {
                flex: 1 1 auto;
                height: 22px;
                background-color: #020525;
                border: 1px solid #810b0b;
                color: white;
                cursor: pointer;
            }

            .hs-heater-workers select:focus {
                outline: none;
            }

            /* === Shared Table Base Styles === */
            .hs-heater-input-table,
            .hs-heater-results-table,
            .hs-heater-subtable {
                border-collapse: collapse;
            }

            .hs-heater-input-table {
                table-layout: fixed;
                font-size: 0.9em;
            }

            .hs-heater-results-table,
            .hs-heater-subtable {
                table-layout: auto;
            }

            .hs-heater-input-table td, .hs-heater-input-table th,
            .hs-heater-results-table td, .hs-heater-results-table th,
            .hs-heater-subtable td, .hs-heater-subtable th {
                padding: 0px 2px;
                border: 1px solid rgba(255,255,255,0.08);
            }

            /* === Input Table Styles === */
            .hs-heater-input-table td,
            .hs-heater-input-table th {
                height: 20px;
                line-height: 20px;
                min-height: 20px;
            }

            .hs-heater-input-table td:first-child,
            .hs-heater-input-table th:first-child {
                white-space: nowrap;
                width: 24px;
                min-width: 24px;
                max-width: 24px;
            }

            .hs-heater-input-table td:nth-child(2),
            .hs-heater-input-table th:nth-child(2) {
                white-space: nowrap;
            }

            .hs-heater-input-table td:nth-child(3),
            .hs-heater-input-table th:nth-child(3) {
                width: auto;
                text-align: center;
            }

            .hs-heater-input-table input {
                width: 100%;
                min-width: 140px;
                box-sizing: border-box;
            }

            .hs-heater-icon-image {
                display: block;
                margin: auto;
                width: 20px;
                height: 20px;
            }

            /* === Results Table Styles === */
            .hs-heater-results-table th:first-child,
            .hs-heater-results-table td:first-child {
                white-space: nowrap;
            }

            .hs-heater-results-table th:last-child,
            .hs-heater-results-table td:last-child {
                text-align: center;
            }

            .hs-heater-results-wrapper {
                overflow-x: auto;
                font-size: 0.95em;
            }

            .hs-heater-results-topbar {
                position: relative;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                box-sizing: border-box;
                margin-left: auto;
                margin-right: auto;
                margin-bottom: 4px;
            }

            .hs-heater-results-topbar > * {
                align-self: center;
                margin-top: 0;
                margin-bottom: 0;
            }

            .hs-heater-results-topbar-exalt {
                position: absolute;
                left: 0px;
                top: 50%;
                transform: translateY(-50%);
                width: 30px;
                height: 30px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255, 255, 255, 0.4);
                background: rgba(1, 20, 50, 0.7);
                cursor: default;
                user-select: none;
            }

            .hs-heater-results-topbar-exalt img {
                width: 24px;
                height: 24px;
                pointer-events: none;
            }

            .hs-heater-results-topbar-help {
                position: absolute;
                right: 0px;
                top: 50%;
                transform: translateY(-50%);
                width: 30px;
                height: 30px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255, 255, 255, 0.4);
                background: rgba(1, 20, 50, 0.7);
                color: #d3d5da;
                font-size: 0.85em;
                line-height: 1;
                cursor: default;
                user-select: none;
            }

            /* === Results & Subtable Styles === */
            .hs-heater-results-table td, .hs-heater-results-table th,
            .hs-heater-subtable td, .hs-heater-subtable th {
                padding: 0px 8px;
                text-align: center;
            }

            .hs-heater-redamb-summary {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 10px;
                font-size: 0.95rem;
                color: #9d9d9d;
            }

            .hs-heater-redamb-summary-table {
                border-collapse: collapse;
                width: max-content;
                margin: 0;
            }

            .hs-heater-redamb-summary-table td {
                padding: 4px 8px;
                text-align: left;
                vertical-align: top;
            }

            .hs-heater-redamb-table-wrapper {
                overflow-x: auto;
            }

            .hs-heater-red-ambrosia-icon-cell {
                width: 24px;
                padding: 0px 0px !important;
            }

            .hs-heater-red-ambrosia-icon {
                display: inline-block;
                width: 24px;
                height: 24px;
                object-fit: contain;
            }

            .hs-heater-red-ambrosia-maxed-row td {
                color: #A9A9A9;
            }

            .hs-heater-red-ambrosia-maxed-row .hs-heater-red-ambrosia-icon {
                opacity: 0.35;
            }

            .hs-heater-redamb-table {
                table-layout: fixed;
                width: auto;
                min-width: auto;
            }

            .hs-heater-redamb-table th,
            .hs-heater-redamb-table td {
                padding: 6px 8px;
            }

            .hs-heater-red-ambrosia-table th,
            .hs-heater-red-ambrosia-table td {
                padding: 1px 6px;
                line-height: 1.2;
                font-size: 0.92rem;
            }

            .hs-heater-red-ambrosia-table th {
                white-space: normal;
                overflow-wrap: anywhere;
                word-break: break-word;
                max-width: 10rem;
            }

            .hs-heater-redamb-table th:first-child {
                max-width: 3rem;
                white-space: nowrap;
            }

            .hs-heater-red-ambrosia-table th:nth-child(2) {
                max-width: 8rem;
            }

            .hs-heater-red-ambrosia-sort-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                width: 100%;
                padding: 0;
                border: 0;
                background: transparent;
                color: inherit;
                font: inherit;
                cursor: pointer;
            }

            .hs-heater-red-ambrosia-sort-button:hover {
                color: #ffffff;
            }

            .hs-heater-red-ambrosia-sort-button:focus-visible {
                outline: 2px solid #8eb5ff;
                outline-offset: 2px;
            }

            .hs-heater-red-ambrosia-sort-button span {
                opacity: 0.7;
            }

            .hs-heater-red-ambrosia-cef-log-cell {
                transition: background-color 0.2s ease;
                background-color: rgba(75, 180, 90, var(--cef-log-alpha, 0));
            }

            .hs-heater-red-ambrosia-cef-log-cell--ambrosia {
                background-color: rgba(95, 155, 255, var(--cef-log-alpha, 0));
            }

            .hs-heater-red-ambrosia-cef-log-cell--red-ambrosia {
                background-color: rgba(215, 80, 80, var(--cef-log-alpha, 0));
            }

            .hs-heater-red-ambrosia-cef-log-cell--octeract {
                background-color: rgba(75, 180, 90, var(--cef-log-alpha, 0));
            }

            .hs-heater-redamb-section-header-row td {
                text-align: left;
                font-weight: 700;
                background-color: rgba(255, 255, 255, 0.05);
            }

            .hs-heater-red-ambrosia-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            /* Sized like the table's text, not like the panel's 150x30 buttons */
            #hs-heater-red-ambrosia-action-btn {
                width: auto;
                height: 22px;
                min-height: 0;
                line-height: 20px;
                padding: 0 8px;
                border-width: 1px;
                box-sizing: border-box;
                font-size: 0.85em;
                white-space: nowrap;
            }

            #hs-heater-red-ambrosia-footer-note {
                width: auto;
                display: inline-block;
                color: grey;
            }

            .hs-heater-subtable th:last-child,
            .hs-heater-subtable td:last-child {
                text-align: center;
            }

            /* === Input Controls === */
            .hs-heater-input-table td.hs-heater-input-warning {
                height: auto;
                white-space: normal;
                color: #e0b84f;
                text-align: center;
            }

            .hs-heater-input-table td.hs-heater-input-heading {
                height: auto;
                padding: 6px 4px 1px;
                border-left: none;
                border-right: none;
                color: #9a9a9a;
                font-size: 0.85em;
                font-weight: bold;
                text-align: left;
            }

            .hs-heater-select-input {
                width: 100%;
                height: 20px;
                background-color: black;
                color: white;
            }

            .hs-heater-percent-input-wrap {
                display: inline-flex;
                align-items: center;
                gap: 2px;
                width: 100%;
            }

            /* === Lock Button === */
            .hs-heater-lock-button {
                min-height: 20px;
                border: none;
                background: transparent;
                cursor: pointer;
                padding: 0;
            }

            .hs-heater-lock-button:hover {
                transform: scale(1.05);
            }

            .hs-heater-lock-cell-locked {
                background: rgba(179, 25, 25, 0.58);
            }

            /* === Grid & Layout === */
            .hs-heater-active-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 0;
            }

            .hs-heater-active-branch {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 0px 8px;
                border-radius: 4px;
                font-size: 0.9em;
                line-height: 1.2;
            }

            .hs-heater-active-branch-note {
                color: #9a9a9a;
            }

            .hs-heater-loadout-buttons {
                display: flex;
                align-items: center;
                gap: 2px;
                flex-wrap: nowrap;
            }

            /* === Type Selector Styles === */
            .hs-heater-inputs-title {
                font-weight: 700;
                text-align: left;
            }

            .hs-heater-active-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }

            .hs-heater-active-bulk {
                display: flex;
                gap: 2px;
            }

            .hs-heater-active-bulk-btn {
                background: none;
                border: none;
                margin: 0;
                padding: 0 2px;
                min-width: 0;
                height: auto;
                font-size: 14px;
                line-height: 1;
                color: #999;
                cursor: pointer;
            }

            .hs-heater-active-bulk-btn:hover {
                color: #ddd;
            }

            .hs-heater-type-selects-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 1px;
            }

            .hs-heater-type-select-row {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .hs-heater-type-select-loadout-label {
                width: 18px;
                min-width: 18px;
                text-align: center;
                font-weight: 600;
            }

            /* L10 and up */
            .hs-heater-type-selects-two-digits .hs-heater-type-select-loadout-label {
                width: 24px;
                min-width: 24px;
            }

            .hs-heater-type-select-icon {
                background-repeat: no-repeat;
                background-size: contain;
                background-position: center;
                height: 26px;
                /* The game's buttons have min-height: 30px */
                min-height: 0;
                width: 26px;
                border: 2px solid blue;
                pointer-events: none;
                outline: none;
            }

            #hs-heater-inputs-body-left input[type="checkbox"] {
                accent-color: #a22a2a;
                height: 16px;
                width: 16px;
            }

            .hs-heater-type-select {
                flex: 1 1 auto;
                min-width: 100px;
                height: 22px;
                background-color: black;
                background-color: #020525;
                border: 1px solid #0c1b9d;
                color: white;
            }

            /* The browser's focus ring would cover the state border below */
            .hs-heater-type-select:focus {
                outline: none;
            }

            .hs-heater-type-select-unavailable {
                border: 1px solid #810b0b;
            }

            /* Heated, but the player can't afford it: nothing to import */
            .hs-heater-type-select-unaffordable {
                border: 1px solid #c96a00;
            }

            .hs-heater-type-select-checkbox {
                width: 16px;
                height: 16px;
                cursor: pointer;
                accent-color: #0505ad;
                box-sizing: border-box;
                padding: 0;
                border: 0;
                flex-shrink: 0;
            }

            .hs-heater-active-checkbox {
                width: 16px;
                height: 16px;
                cursor: pointer;
                accent-color: #a22a2a;
                box-sizing: border-box;
                padding: 0;
                border: 0;
                flex-shrink: 0;
            }

            /* === Typography & Text === */
            .hs-heater-title-row {
                font-weight: bold;
                text-align: center;
                padding: 4px 2px;
                background: rgba(255,255,255,0.05);
            }

            .hs-heater-header-row {
                background: rgba(100,100,100,0.2);
            }

            .hs-heater-header-tooltip {
                position: relative;
                cursor: help;
            }

            .hs-heater-header-tooltip::after {
                content: "";
                position: absolute;
                top: 0;
                right: 0;
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-bottom: 5px solid transparent;
                border-top: 5px solid rgb(122, 144, 255);
                border-right: 5px solid rgb(122, 144, 255);
                pointer-events: none;
            }

            .hs-heater-selected-type-cell,
            .hs-heater-selected-type-cell .hs-heater-type-icon-button {
                background: rgba(40, 110, 240, 0.06);
            }
            .hs-heater-selected-type-cell .hs-heater-type-icon-button:hover {
                background: rgba(27, 93, 217, 0.4) !important;
            }

            .hs-heater-result-cell {
                white-space: normal;
                word-break: break-word;
            }

            .hs-heater-json-pre {
                margin: 0;
            }

            .hs-heater-type-cell-content {
                display: flex;
                align-items: center;
                gap: 3px;
                width: 100%;
                min-width: 0;
            }

            .hs-heater-results-table td:has(.hs-heater-type-icon),
            .hs-heater-subtable td:has(.hs-heater-type-icon) {
                display: flex;
                align-items: center;
                gap: 0;
            }

            .hs-heater-type-icon-button {
                display: flex;
                align-items: center;
                cursor: pointer;
                flex: 1 1 auto;
                min-width: 0;
                width: auto;
                height: auto;
                min-height: 22px;
            }

            .hs-heater-type-info-trigger {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 16px;
                width: 16px;
                height: 16px;
                padding: 0;
                border: 1px solid rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                background: transparent;
                color: inherit;
                font-size: 11px;
                line-height: 1;
                cursor: help;
                user-select: none;
            }

            .hs-heater-type-info-trigger:focus-visible {
                outline: 2px solid #8eb5ff;
                outline-offset: 2px;
            }

            .hs-heater-type-label {
                flex: 1;
                text-align: center;
                box-sizing: border-box;
                padding: 0 18px;
            }

            .hs-heater-type-icon {
                flex-shrink: 0;
                width: 22px;
                height: 22px;
                object-fit: contain;
                pointer-events: none;
            }

            /* === Buttons & Interactive === */
            .hs-heater-copy-loadout-btn,
            .hs-heater-import-loadout-btn,
            .hs-heater-apply-routing-btn {
                height: 20px;
                min-height: 20px;
                cursor: pointer;
                padding: 1px 4px;
                font-size: 0.85em;
                border: 2px solid transparent;
            }

            /* Common section with Purple rows: Effect and Routing are one cell spanning both
               effect columns, split at a fixed width. As two real columns,
               the routing's width would set the p4x4 section's columns too. */
            .hs-heater-results-table .hs-heater-split-cell {
                position: relative;
                padding-left: 4px;
                padding-right: 4px;
                /* The "Effect" header in bold is about 3.35em wide */
                --hs-heater-split-effect-width: 3.4em;
            }

            .hs-heater-split-cell::before {
                content: "";
                position: absolute;
                top: 0;
                bottom: 0;
                left: calc(8px + var(--hs-heater-split-effect-width));
                border-left: 1px solid rgba(255,255,255,0.08);
            }

            .hs-heater-split {
                display: grid;
                grid-template-columns: var(--hs-heater-split-effect-width) 1fr;
                column-gap: 9px;
                align-items: center;
            }

            /* Fixed tracks, so the four routings line up whatever their
               percentages, with or without the Apply button. The icon tracks
               are narrower than the icons, whose sides are transparent. */
            .hs-heater-purple-routing {
                display: grid;
                grid-template-columns: 12px 2.8em 12px 2.5em auto;
                column-gap: 1px;
                align-items: center;
                justify-content: start;
                justify-items: start;
                font-size: 0.9em;
                white-space: nowrap;
                cursor: help;
            }

            .hs-heater-purple-routing .hs-heater-apply-routing-btn {
                padding: 0;
                font-size: 1em;
                line-height: 1;
                color: var(--purple-text-color, #FF29FF);
            }

            .hs-heater-routing-icon {
                width: 16px;
                height: 16px;
                margin: 0 -2px;
                object-fit: contain;
            }

            .hs-heater-effect-pair {
                display: inline-flex;
                align-items: center;
                gap: 3px;
            }

            .hs-heater-effect-icon {
                width: 16px;
                height: 16px;
                object-fit: contain;
            }

            /* The Offerings pair, apart from the Obtainium one */
            .hs-heater-effect-icon + .hs-heater-effect-icon {
                margin-left: 8px;
            }

            .hs-heater-json-tooltip-trigger {
                display: inline-block;
                cursor: help;
                user-select: none;
            }

            /* === Status & Colors === */
            .hs-heater-status-maxed { color: #08ba52; }
            .hs-heater-status-unmaxed { color: #962f2f; }
            .hs-heater-limit-icon {
                width: 16px;
                height: 16px;
                vertical-align: middle;
                margin-left: 3px;
                cursor: help;
            }
            .hs-heater-best-h-marker { color: #f2c94c; white-space: nowrap; cursor: help; }

            /* Opacity, not a text colour: the ✔/✘, icons and buttons must dim too. */
            .hs-heater-never-row td { opacity: 0.55; }

            /* Same orange as the slot's border in "Your loadout order". The
               type's label is in a button when it has an icon, and a button
               doesn't inherit the row's colour. */
            .hs-heater-selected-unaffordable-row td,
            .hs-heater-selected-unaffordable-row .hs-heater-type-icon-button {
                color: #c96a00;
            }

            /* An unaffordable row's short resource, same red as the ✘. After
               the rule above, which has the same specificity. */
            td.hs-heater-short-cost {
                color: #962f2f;
                cursor: help;
            }

            .hs-heater-inputs-header { background-color: #472323; }
            .hs-heater-results-header { background-color: #232647; }
            .hs-heater-redamb-header { background-color: #472323; }
            .redButton { background-color: #3f0101; }
            .redButton:hover { background-color: #b71919; }
            .blueButton { background-color: #05013f; }
            .blueButton:hover { background-color: #291ece; }

            /* === Preview === */

            #hs-heater-sync-settings-btn.hs-heater-sync-settings-warning::after {
                content: ' ⚠️';
            }


        `;
    }

    static getHeaterOverlayStylesCss(): string {
        return `
            .hs-heater-header-icon {
                vertical-align: middle;
                height: 22px;
                width: 22px;
            }

            .hs-heater-header-icon-small {
                height: 16px;
                width: 16px;
            }

            /* The size of the Obt + Off Effect icons */
            .hs-heater-effect-header-icon {
                height: 16px;
                width: 16px;
                margin-right: 4px;
            }

            /* === Floating Preview Container (base) === */
            .hs-heater-loadout-preview {
                position: fixed;
                z-index: 10000;
                background: #1e1e1e;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                padding: 2px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                max-width: 480px;
                max-height: 400px;
                overflow: auto;
            }

            /* === Floating Preview Rows (base) === */
            .hs-heater-loadout-preview-row {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 4px;
            }

            /* Match the game's grouped blueberry grid, including its general column. */
            .hs-heater-loadout-preview-grid {
                --ambrosia-cell-size: 32px;
                --ambrosia-grid-gap: 4px;
                display: grid;
                grid-column: auto;
                grid-row: auto;
                grid-template-columns: 32px 248px;
                grid-template-rows: repeat(6, 32px);
                gap: 8px 4px;
                width: 284px;
            }

            .hs-heater-loadout-preview-grid .blueberryUpgradeGroup {
                display: grid;
                grid-column: 2;
                grid-template-columns: repeat(auto-fit, 32px);
                justify-content: start;
                gap: 4px;
            }

            .hs-heater-loadout-preview-grid .blueberryUpgradeGroup[data-upgrade-group="general"] {
                grid-column: 1;
                grid-row: 1 / span 6;
                grid-template-columns: 32px;
                grid-template-rows: repeat(6, 32px);
                row-gap: 8px;
            }

            /* === Floating Preview Item/Button === */
            .hs-heater-preview-button {
                width: 32px;
                height: 32px;
                padding: 0;
                border: none;
                background: transparent;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                pointer-events: none;
            }

            .hs-heater-preview-button img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }

            /* === Floating Preview Empty Placeholder === */
            .hs-heater-preview-empty-cell {
                width: 32px;
                height: 32px;
                background: rgba(100, 100, 100, 0.3);
                border-radius: 2px;
            }

            .blueberryUpgrade > .level-overlay {
                background-color: transparent;
            }

            /* === Heater Tooltip Overlays === */
            .hs-heater-loadout-json-tooltip {
                position: fixed;
                z-index: 10000;
                background: #1e1e1e;
                color: #d3d5da;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px;
                padding: 6px 8px;
                word-break: break-word;
                font-family: monospace;
                font-size: 0.85em;
                max-width: 600px;
                max-height: 500px;
                overflow-y: auto;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                white-space: pre-wrap;
            }

            .hs-heater-tooltip-title {
                width: auto;
                text-align: center;
                margin-bottom: 2px;
                font-size: 0.9em;
            }

            .hs-heater-tooltip-pin-button {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 18px;
                height: 18px;
                min-width: 18px;
                min-height: 18px;
                border: none;
                border-radius: 50%;
                background: rgba(255,255,255,0.1);
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                font-size: 0.9em;
                line-height: 1;
            }

            .hs-heater-tooltip-pinned {
                border-color: rgba(86, 156, 255, 0.85);
                cursor: grab;
                touch-action: none;
            }

            .hs-heater-tooltip-pinned:active {
                cursor: grabbing;
            }
        `;
    }

    static ensureHeaterStylesInjected(): void {
        if (this.#heaterStylesInjected) return;

        HSUI.injectStyle(`${this.getHeaterBaseStylesCss()}\n${this.getHeaterOverlayStylesCss()}`);
        this.#heaterStylesInjected = true;
    }
}
