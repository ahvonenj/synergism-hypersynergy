export type SparklineDataKey = 'time' | 'quarks' | 'goldenQuarks';

export interface SparklineMetric {
    timestamp: number;
    duration: number;
    quarksGained: number;
    goldenQuarksGained: number;
    runningAvgDuration: number;
    runningAvgQuarksPerSecond: number;
    runningAvgGoldenQuarksPerSecond: number;
}

/**
 * Updates the sparkline chart display for the given DOM and data.
 * single-pass min/max/sum, no intermediate array allocations,
 * dataKey-based field access instead of container.id checks.
 */
export function updateSparkline(
    dom: SparklineDom | null,
    data: SparklineMetric[],
    computedGraphWidth: number | null,
    formatNumberWithSign: (n: number) => string,
    maxPoints: number
): void {
    if (!dom) return;

    // Data is already pruned to maxPoints by the caller; handle any overflow defensively
    const start = data.length > maxPoints ? data.length - maxPoints : 0;
    const len = data.length - start;

    // If not enough data, clear chart and labels
    if (len < 2) {
        dom.rawPolyline.setAttribute('points', '');
        if (dom.avgPolyline) dom.avgPolyline.setAttribute('points', '');
        dom.labelMax.textContent = '';
        dom.labelAvg.textContent = '';
        dom.labelMin.textContent = '';
        return;
    }

    const gw = computedGraphWidth || 230;
    const key = dom.dataKey;
    const isTime = key === 'time';

    // Single pass: compute time range, Y range, and label avg aggregates — no intermediate arrays
    let minTime = data[start].timestamp;
    let maxTime = minTime;
    let minY = Infinity;
    let maxY = -Infinity;
    let labelAvgNumerator = 0;
    let labelAvgDenominator = 0;

    for (let i = start; i < data.length; i++) {
        const m = data[i];
        const t = m.timestamp;
        if (t < minTime) minTime = t;
        if (t > maxTime) maxTime = t;

        let rawY: number, avgY: number;
        if (isTime) {
            rawY = m.duration;
            avgY = m.runningAvgDuration || 0;
            labelAvgNumerator += rawY;
            labelAvgDenominator++;
        } else if (key === 'quarks') {
            rawY = m.quarksGained / m.duration;
            avgY = m.runningAvgQuarksPerSecond || 0;
            labelAvgNumerator += m.quarksGained;
            labelAvgDenominator += m.duration;
        } else {
            rawY = m.goldenQuarksGained / m.duration;
            avgY = m.runningAvgGoldenQuarksPerSecond || 0;
            labelAvgNumerator += m.goldenQuarksGained;
            labelAvgDenominator += m.duration;
        }

        if (rawY < minY) minY = rawY;
        if (rawY > maxY) maxY = rawY;
        if (avgY < minY) minY = avgY;
        if (avgY > maxY) maxY = avgY;
    }

    const timeRange = maxTime - minTime || 1;
    const yRange = maxY - minY || 1;

    // Only update SVG width if changed
    const widthChanged = dom.lastWidth !== gw;
    if (widthChanged) {
        dom.svg.setAttribute('width', `${gw}`);
        dom.lastWidth = gw;
    }

    // Build polyline points — pre-allocate parts array, single pass
    const rawParts = new Array<string>(len);
    const avgParts = new Array<string>(len);
    for (let i = start; i < data.length; i++) {
        const m = data[i];
        const x = ((m.timestamp - minTime) / timeRange) * gw;

        let rawY: number, avgY: number;
        if (isTime) {
            rawY = m.duration;
            avgY = m.runningAvgDuration || 0;
        } else if (key === 'quarks') {
            rawY = m.quarksGained / m.duration;
            avgY = m.runningAvgQuarksPerSecond || 0;
        } else {
            rawY = m.goldenQuarksGained / m.duration;
            avgY = m.runningAvgGoldenQuarksPerSecond || 0;
        }

        const rawSvgY = 30 - ((rawY - minY) / yRange) * 30;
        const avgSvgY = 30 - ((avgY - minY) / yRange) * 30;
        const idx = i - start;
        rawParts[idx] = `${x},${rawSvgY}`;
        avgParts[idx] = `${x},${avgSvgY}`;
    }
    const rawPointsStr = rawParts.join(' ');
    const avgPointsStr = avgParts.join(' ');

    // Polyline DOM updates (with change guards)
    if (isTime) {
        if (dom.lastPoints !== rawPointsStr) {
            dom.rawPolyline.setAttribute('points', rawPointsStr);
            dom.lastPoints = rawPointsStr;
        }
        if (dom.avgPolyline && dom.lastPointsSecond !== avgPointsStr) {
            dom.avgPolyline.setAttribute('points', avgPointsStr);
            dom.lastPointsSecond = avgPointsStr;
        }
    } else {
        if (dom.avgPolyline && dom.lastPoints !== avgPointsStr) {
            dom.avgPolyline.setAttribute('points', avgPointsStr);
            dom.lastPoints = avgPointsStr;
        }
        if (dom.lastPointsSecond !== rawPointsStr) {
            dom.rawPolyline.setAttribute('points', rawPointsStr);
            dom.lastPointsSecond = rawPointsStr;
        }
    }

    // Min/max marker lines
    const markerX = Math.max(0, gw - 4);
    const maxYPos = 30 - ((maxY - minY) / yRange) * 30;
    const minYPos = 30;

    if (widthChanged) {
        const gwStr = `${gw}`;
        const markerXStr = `${markerX}`;
        const maxYStr = `${maxYPos}`;
        const minYStr = `${minYPos}`;
        dom.maxLine.setAttribute('x1', markerXStr);
        dom.maxLine.setAttribute('x2', gwStr);
        dom.maxLine.setAttribute('y1', maxYStr);
        dom.maxLine.setAttribute('y2', maxYStr);
        dom.minLine.setAttribute('x1', markerXStr);
        dom.minLine.setAttribute('x2', gwStr);
        dom.minLine.setAttribute('y1', minYStr);
        dom.minLine.setAttribute('y2', minYStr);
        dom.lastMaxY = maxYPos;
        dom.lastMinY = minYPos;
    } else {
        if (dom.lastMaxY !== maxYPos) {
            const maxYStr = `${maxYPos}`;
            dom.maxLine.setAttribute('y1', maxYStr);
            dom.maxLine.setAttribute('y2', maxYStr);
            dom.lastMaxY = maxYPos;
        }
        if (dom.lastMinY !== minYPos) {
            const minYStr = `${minYPos}`;
            dom.minLine.setAttribute('y1', minYStr);
            dom.minLine.setAttribute('y2', minYStr);
            dom.lastMinY = minYPos;
        }
    }

    // Labels
    const labelSuffix = isTime ? 's' : ' /s';
    let labelMax: string, labelAvg: string, labelMin: string;
    if (isTime) {
        labelMax = `${maxY.toFixed(2)}${labelSuffix}`;
        labelAvg = labelAvgDenominator > 0 ? `${(labelAvgNumerator / labelAvgDenominator).toFixed(2)}${labelSuffix} avg` : `0.00${labelSuffix} avg`;
        labelMin = `${minY.toFixed(2)}${labelSuffix}`;
    } else {
        labelMax = `${formatNumberWithSign(maxY)}${labelSuffix}`;
        labelAvg = labelAvgDenominator > 0 ? `${formatNumberWithSign(labelAvgNumerator / labelAvgDenominator)}${labelSuffix}` : `0.00${labelSuffix}`;
        labelMin = `${formatNumberWithSign(minY)}${labelSuffix}`;
    }
    if (dom.lastLabelMax !== labelMax) {
        dom.labelMax.textContent = labelMax;
        dom.lastLabelMax = labelMax;
    }
    if (dom.lastLabelAvg !== labelAvg) {
        dom.labelAvg.textContent = labelAvg;
        dom.lastLabelAvg = labelAvg;
    }
    if (dom.lastLabelMin !== labelMin) {
        dom.labelMin.textContent = labelMin;
        dom.lastLabelMin = labelMin;
    }
}

/**
 * Sparkline chart logic extracted from hs-autosingModal.ts.
 *
 * All chart rendering and DOM logic for sparklines is now modularized here for maintainability and reuse.
 *
 * Interface summary:
 *   - updateSparkline(dom, data, computedGraphWidth, formatNumberWithSign, maxPoints):
 *     - Modal passes full metrics array and maxPoints
 *     - Chart slices internally for display and label stats
 */
export interface SparklineDom {
    container: HTMLElement;
    svg: SVGSVGElement;
    rawPolyline: SVGPolylineElement;
    avgPolyline: SVGPolylineElement | null;
    maxLine: SVGLineElement;
    minLine: SVGLineElement;
    labelMax: HTMLSpanElement;
    labelAvg: HTMLSpanElement;
    labelMin: HTMLSpanElement;
    isTime: boolean;
    dataKey: SparklineDataKey;
    color: string;
    lastWidth: number;
    lastPoints: string;
    lastPointsSecond: string;
    lastMaxY: number;
    lastMinY: number;
    lastLabelMax: string;
    lastLabelAvg: string;
    lastLabelMin: string;
}

/**
 * Creates and initializes the DOM structure for a sparkline chart.
 *
 * This function builds the SVG and label elements for a sparkline, including:
 *   - SVG polylines for raw and average lines (dashed and solid)
 *   - Horizontal marker lines for min and max values
 *   - Label spans for min, avg, and max values
 *
 * Returns a SparklineDom object with references to all key elements for efficient updates.
 *
 * @param container The parent HTML element to contain the sparkline chart.
 * @param color The color to use for the chart lines and labels.
 * @param isTime Whether this chart is for time/duration (true) or for rates (false).
 * @param dataKey The data key identifying which metric fields to use ('time', 'quarks', or 'goldenQuarks').
 * @returns SparklineDom object with references to SVG, polylines, marker lines, and labels, or null if container is missing.
 */
export function buildSparklineDom(container: HTMLElement | null, color: string, isTime: boolean, dataKey: SparklineDataKey = 'time'): SparklineDom | null {
    if (!container) return null;
    container.textContent = '';
    const ns = 'http://www.w3.org/2000/svg';
    // --- SVG setup ---
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('height', '30');
    svg.style.display = 'block';
    svg.style.overflow = 'visible';

    // --- Raw polyline (dashed, lower opacity) ---
    const rawPolyline = document.createElementNS(ns, 'polyline');
    rawPolyline.setAttribute('fill', 'none');
    rawPolyline.setAttribute('stroke', color);
    rawPolyline.setAttribute('stroke-width', '1');
    rawPolyline.setAttribute('stroke-opacity', '0.5');
    rawPolyline.setAttribute('stroke-dasharray', '2,2');

    // --- Avg polyline (solid, higher opacity) ---
    const avgPolyline = document.createElementNS(ns, 'polyline');
    avgPolyline.setAttribute('fill', 'none');
    avgPolyline.setAttribute('stroke', color);
    avgPolyline.setAttribute('stroke-width', '1');
    avgPolyline.setAttribute('stroke-opacity', '0.8');

    // --- Marker lines for min/max ---
    const maxLine = document.createElementNS(ns, 'line');
    maxLine.setAttribute('stroke', color);
    maxLine.setAttribute('stroke-width', '1');
    const minLine = document.createElementNS(ns, 'line');
    minLine.setAttribute('stroke', color);
    minLine.setAttribute('stroke-width', '1');

    // --- Assemble SVG ---
    svg.appendChild(rawPolyline);
    svg.appendChild(avgPolyline);
    svg.appendChild(maxLine);
    svg.appendChild(minLine);

    // --- Labels for min/avg/max ---
    const labels = document.createElement('div');
    labels.className = 'hs-sparkline-labels';
    const labelMax = document.createElement('span');
    labelMax.className = 'hs-sparkline-muted';
    const labelAvg = document.createElement('span');
    labelAvg.className = 'hs-sparkline-avg';
    labelAvg.style.color = color;
    labelAvg.style.fontWeight = 'bold';
    const labelMin = document.createElement('span');
    labelMin.className = 'hs-sparkline-muted';
    labels.appendChild(labelMax);
    labels.appendChild(labelAvg);
    labels.appendChild(labelMin);

    // --- Attach to container ---
    container.appendChild(svg);
    container.appendChild(labels);

    // --- Return SparklineDom object with all references and state ---
    return {
        container,
        svg,
        rawPolyline,
        avgPolyline,
        maxLine,
        minLine,
        labelMax,
        labelAvg,
        labelMin,
        isTime,
        dataKey,
        color,
        lastWidth: 0,
        lastPoints: '',
        lastPointsSecond: '',
        lastMaxY: 0,
        lastMinY: 0,
        lastLabelMax: '',
        lastLabelAvg: '',
        lastLabelMin: ''
    };
}
