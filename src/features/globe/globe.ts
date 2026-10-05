import { cityLocalTime } from './city-clocks.js';
import { cityTimezones } from './data/city-timezones.js';
import { continentLabels } from './data/continent-labels.js';
import { geographyLabels } from './data/geography-labels.js';
import { initializeModes } from '../../ui/modes.js';
import {
    createApproximateLocation,
    requestDeviceLocation,
    getDeviceLocationStatus,
} from '../../services/location.js';
import type { ApproximateArea } from '../../services/location.js';
import { normalizedDirection, longitudeDelta, cameraCenter, rotateCamera } from './motion.js';
import { currentLanguage, t } from '../../i18n/index.js';
import { distanceKm } from '../../domain/logic.js';
import type { Stop } from '../../domain/planner.js';
import type { Airport } from '../../domain/logic.js';
import { simulatedArcWindow, routeDrawDuration, simulationGlow } from './simulated-routes.js';
import type { SimulatedRoute } from './simulated-routes.js';

type GeoShape = { type: 'Polygon'; coordinates: Point[][] };
type GeoMultiShape = { type: 'MultiPolygon'; coordinates: Point[][][] };
type BoundaryShape = { type: 'LineString' | 'MultiLineString'; coordinates: Point[] | Point[][] };
type GeoProjection = {
    rotate: (angles: number[]) => GeoProjection;
    scale: (scale: number) => GeoProjection;
    translate: (point: number[]) => GeoProjection;
    clipAngle: (angle: number) => GeoProjection;
    precision: (value: number) => GeoProjection;
};
type GeoRenderer = {
    geoOrthographic: () => GeoProjection;
    geoPath: (
        projection: GeoProjection,
        context: CanvasRenderingContext2D,
    ) => (shape: GeoShape | GeoMultiShape | BoundaryShape) => void;
    geoArea: (shape: GeoShape) => number;
};
const geo = (globalThis as typeof globalThis & { d3: GeoRenderer }).d3;
type Point = [number, number];
type Vector = [number, number, number];
type Land = { features: { geometry: { type: string; coordinates: Point[][] | Point[][][] } }[] };
const rad = (degrees: number) => (degrees * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;
function vector(lat: number, lon: number): Vector {
    return [
        Math.cos(rad(lat)) * Math.cos(rad(lon)),
        Math.cos(rad(lat)) * Math.sin(rad(lon)),
        Math.sin(rad(lat)),
    ];
}
function latLon(v: Vector): Point {
    return [deg(Math.asin(Math.max(-1, Math.min(1, v[2])))), deg(Math.atan2(v[1], v[0]))];
}

// Great-circle interpolation follows actual endpoints. Antipodes have no unique
// shortest arc: choose a stable orthogonal plane instead of dividing by zero.
export function routePoint(from: Point, to: Point, t: number): Point {
    const a = vector(...from),
        b = vector(...to);
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const angle = Math.acos(dot);
    if (angle < 1e-6) return from;
    if (Math.PI - angle < 1e-5) {
        const axis: Vector = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
        const cross: Vector = [
            a[1] * axis[2] - a[2] * axis[1],
            a[2] * axis[0] - a[0] * axis[2],
            a[0] * axis[1] - a[1] * axis[0],
        ];
        const length = Math.hypot(...cross);
        const c = Math.cos(Math.PI * t),
            s = Math.sin(Math.PI * t);
        return latLon([
            a[0] * c + (cross[0] / length) * s,
            a[1] * c + (cross[1] / length) * s,
            a[2] * c + (cross[2] / length) * s,
        ]);
    }
    const x = Math.sin((1 - t) * angle) / Math.sin(angle),
        y = Math.sin(t * angle) / Math.sin(angle);
    return latLon([a[0] * x + b[0] * y, a[1] * x + b[1] * y, a[2] * x + b[2] * y]);
}

export function createGlobe(canvas: HTMLCanvasElement): {
    setSimulation: (route: SimulatedRoute | null) => void;
    setRoute: (from?: Airport, to?: Airport) => void;
    setStops: (stops: Stop[]) => void;
    fit: () => void;
    setPlaces: (airports: Airport[]) => void;
    focusRegion: (stop: Stop) => void;
    view: () => { lat: number; lon: number; moving: boolean };
    centerLabel: (lat: number, lon: number) => void;
} {
    const ctx = canvas.getContext('2d');
    const status = document.getElementById('globe-status')!;
    const backdrop = document.getElementById('globe-backdrop')!;
    backdrop.append(canvas);
    if (!ctx || !geo) {
        canvas.hidden = true;
        document.getElementById('globe-fallback')!.hidden = false;
        document.querySelectorAll<HTMLButtonElement>('.globe-controls button').forEach((b) => {
            b.disabled = true;
        });
        document.body.classList.add('no-globe');
        (document.getElementById('globe-mode') as HTMLButtonElement).disabled = true;
        return {
            setSimulation: () => {},
            setStops: () => {},
            setRoute: () => {},
            fit: () => {},
            setPlaces: () => {},
            focusRegion: () => {},
            centerLabel: () => {},
            view: () => ({ lat: 18, lon: 12, moving: false }),
        };
    }
    const context = ctx;
    let polygons: Point[][] = [];
    let landShapes: GeoShape[] = [];
    let boundaries: BoundaryShape[] = [];
    let vegetation: { geometry: GeoShape; biome: number; center: Point; radius: number }[] = [],
        rivers: BoundaryShape[] = [];
    let simulation: SimulatedRoute | null = null,
        simulationTime = 0,
        simulationDrawMs = 4800;
    const landProjection = geo.geoOrthographic().clipAngle(90).precision(0.5);
    const landPath = geo.geoPath(landProjection, context);
    // Labels use representative airport coordinates from the bundled licensed
    // catalog, not invented city centers or claims of available service.
    let places: Airport[] = [],
        majorCount = 0;
    let blockers: DOMRect[] = [];
    let blockerDirty = true;
    const markBlockers = (): void => {
        blockerDirty = true;
        dirty = true;
    };
    for (const node of document.querySelectorAll<HTMLElement>('#globe-dock')) {
        new ResizeObserver(markBlockers).observe(node);
        new MutationObserver(markBlockers).observe(node, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['hidden', 'open', 'style', 'aria-pressed'],
        });
    }
    document.addEventListener(
        'pointermove',
        () => {
            if (interactive) blockerDirty = true;
        },
        { passive: true },
    );
    window.addEventListener(
        'scroll',
        () => {
            blockerDirty = true;
            dirty = true;
        },
        { passive: true },
    );
    window.addEventListener(
        'resize',
        () => {
            blockerDirty = true;
        },
        { passive: true },
    );
    window.addEventListener('roamnest-cities-change', markBlockers);
    window.addEventListener('roamnest-simulation-change', markBlockers);
    let stops: Stop[] = [];
    function viewportFitZoom(): number {
        const w = canvas.clientWidth || innerWidth,
            h = canvas.clientHeight || innerHeight;
        return Math.min(w * 0.43, h * 0.39) / Math.min(w * 0.38, h * 0.405);
    }
    let centerLat = 18,
        centerLon = 12,
        cameraRoll = 0,
        zoom = viewportFitZoom();
    const turn = (yaw: number, pitch: number): void => {
        const next = rotateCamera({ lon: centerLon, lat: centerLat, roll: cameraRoll }, yaw, pitch);
        centerLon = next.lon;
        centerLat = next.lat;
        cameraRoll = next.roll;
    };
    let zoomTween: { from: number; to: number; started: number } | null = null;
    let width = 600,
        height = 430,
        dpr = 1;
    let motionPaused = false,
        night = false;

    const phase = 'background';
    let lastTick = 0;
    let interactive = false,
        exposed = false,
        entryCentered = false,
        recenterCount = 0,
        pointerHeld = false,
        interacted = false,
        locationReset = 0;
    let cursor: { x: number; y: number; time: number } | null = null;
    let idleDirection: Point = [1, 0],
        dragVelocity: Point = [0, 0],
        dragged = false,
        lastDragTime = 0;
    let coast: { started: number; duration: number; velocity: Point } | null = null;
    let gestureWasRotating = false;
    const INPUT_IDLE = 5.525,
        GLOBE_IDLE = 5.525,
        MANUAL_GAIN = 0.585;
    let home: ApproximateArea | null = null;
    let recenter: {
        lat: number;
        lon: number;
        targetLat: number;
        deltaLon: number;
        roll: number;
        deltaRoll: number;
        started: number;
    } | null = null;
    const pointers = new Map<number, Point>();
    const clearCursor = (): void => {
        cursor = null;
    };
    const remember = (lon: number, lat: number): void => {
        if (Math.hypot(lon, lat) > 0.3) idleDirection = normalizedDirection(lon, lat);
    };
    let visible = true,
        dirty = true,
        previousFrame = 0,
        drawCount = 0,
        clockMinute = -1;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motion.matches;
    const fitInput = (): void => {
        const next = viewportFitZoom();
        if (reduced || motionPaused) {
            zoom = next;
            zoomTween = null;
        } else if (
            Math.abs(zoom - next) > 0.002 &&
            Math.abs((zoomTween?.to ?? zoom) - next) > 0.002
        )
            zoomTween = { from: zoom, to: next, started: performance.now() };
        dirty = true;
    };
    const beginHome = (explicit = false): void => {
        if (
            !home ||
            !interactive ||
            pointerHeld ||
            document.hidden ||
            (!explicit && (entryCentered || interacted || reduced || motionPaused))
        )
            return;
        entryCentered = true;
        recenterCount++;
        if (explicit && (reduced || motionPaused)) {
            centerLat = home.lat;
            centerLon = home.lon;
            cameraRoll = 0;
            recenter = null;
            emitView();
        } else
            recenter = {
                lat: centerLat,
                lon: centerLon,
                targetLat: Math.max(-75, Math.min(75, home.lat)),
                deltaLon: longitudeDelta(centerLon, home.lon),
                roll: cameraRoll,
                deltaRoll: longitudeDelta(cameraRoll, 0),
                started: performance.now(),
            };
        dirty = true;
    };
    const location = createApproximateLocation((area) => {
        home = area;
        if (!area) recenter = null;
        else beginHome();
        dirty = true;
    });
    let preferenceApply = false;
    const applyLocationPreference = (): void => {
        const token = locationReset;
        preferenceApply = false;
        void location.reset().then((area) => {
            if (!area || !location.enabled || token !== locationReset || !interactive) return;
            home = area;
            beginHome(true);
        });
    };
    const leave = (): void => {
        exposed = false;
        clearCursor();
        dirty = true;
    };
    const clearGestures = (): void => {
        for (const id of pointers.keys())
            if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
        pointers.clear();
        pointerHeld = false;
        coast = null;
        dragged = false;
        leave();
    };
    const takeControl = (): void => {
        coast = null;
        locationReset++;
        zoomTween = null;
        interacted = true;
        entryCentered = true;
        recenter = null;
        dirty = true;
    };
    const changeMode = (globe: boolean): void => {
        locationReset++;
        interactive = globe;
        clearGestures();
        recenter = null;
        entryCentered = false;
        interacted = false;
        blockerDirty = true;
        dirty = true;
        zoomTween = null;
        if (!globe) {
            motionPaused = false;
            document.body.classList.remove('motion-paused');
            fitInput();
        }
        if (globe && preferenceApply) applyLocationPreference();
        else if (globe && !reduced && !motionPaused) {
            if (home) beginHome();
            else location.enter();
        }
    };
    window.addEventListener('roamnest-location-preference', () => {
        locationReset++;
        preferenceApply = location.enabled;
        if (interactive && preferenceApply) applyLocationPreference();
    });
    window.addEventListener('roamnest-language-change', () => {
        dirty = true;
        blockerDirty = true;
    });
    motion.addEventListener('change', () => {
        reduced = motion.matches;
        clearCursor();
        recenter = null;
        dirty = true;
    });
    canvas.addEventListener('pointerdown', (event) => {
        if (!interactive || event.button !== 0) return;
        if (!pointers.size) gestureWasRotating = !interacted || coast !== null;
        takeControl();
        if (!pointers.size) {
            dragged = false;
            dragVelocity = [0, 0];
            lastDragTime = performance.now();
        }
        pointerHeld = true;
        pointers.set(event.pointerId, [event.clientX, event.clientY]);
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
        if (!interactive) return;
        exposed = true;
        cursor =
            !reduced && !motionPaused
                ? { x: event.clientX, y: event.clientY, time: performance.now() }
                : null;
        const previous = pointers.get(event.pointerId);
        if (previous) {
            takeControl();
            if (pointers.size >= 2) {
                dragged = false;
                const pair = Array.from(pointers.entries()).slice(0, 2);
                const before = Math.hypot(
                    pair[0]![1][0] - pair[1]![1][0],
                    pair[0]![1][1] - pair[1]![1][1],
                );
                pointers.set(event.pointerId, [event.clientX, event.clientY]);
                const afterPair = Array.from(pointers.values()).slice(0, 2);
                const after = Math.hypot(
                    afterPair[0]![0] - afterPair[1]![0],
                    afterPair[0]![1] - afterPair[1]![1],
                );
                if (before > 4) zoom = Math.max(0.45, Math.min(8, (zoom * after) / before));
            } else {
                const dx = event.clientX - previous[0],
                    dy = event.clientY - previous[1];
                pointers.set(event.pointerId, [event.clientX, event.clientY]);
                const anglePerPixel = Math.max(
                    0.01,
                    Math.min(
                        0.28,
                        (MANUAL_GAIN * 180) /
                            (Math.PI * Math.max(1, Math.min(width * 0.38, height * 0.405) * zoom)),
                    ),
                );
                turn(-dx * anglePerPixel, dy * anglePerPixel);
                remember(-dx, dy);
                const now = performance.now(),
                    seconds = Math.max(0.008, (now - lastDragTime) / 1000);
                dragVelocity = [(-dx * anglePerPixel) / seconds, (dy * anglePerPixel) / seconds];
                lastDragTime = now;
                dragged = dragged || Math.hypot(dx, dy) > 0.5;
            }
        }
        dirty = true;
    });
    const emitView = (): void => {
        window.dispatchEvent(new Event('roamnest-globe-view-settled'));
    };
    const endPointer = (event: PointerEvent): void => {
        pointers.delete(event.pointerId);
        pointerHeld = pointers.size > 0;
        if (canvas.hasPointerCapture(event.pointerId))
            canvas.releasePointerCapture(event.pointerId);
        if (event.pointerType !== 'mouse' && !pointerHeld) leave();
        if (!pointerHeld) {
            if (event.type === 'pointerup' && dragged && !reduced && !motionPaused) {
                interacted = false;
                const length = Math.hypot(...dragVelocity),
                    strong = length > 25,
                    boost = strong ? 1 + Math.min(1.4, (length - 25) / 35) : 1,
                    cap = (strong ? 90 : 50) / Math.max(1, zoom),
                    scale = boost * Math.min(1, cap / Math.max(0.001, length * boost));
                coast = {
                    started: performance.now(),
                    duration: strong
                        ? 6000 + Math.min(6000, (length - 25) * 180)
                        : 1200 + Math.min(2400, length * 60),
                    velocity: [dragVelocity[0] * scale, dragVelocity[1] * scale],
                };
                renderMotion();
            } else {
                if (!dragged && gestureWasRotating && !reduced && !motionPaused) interacted = false;
                emitView();
            }
        }
        renderMotion();
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('lostpointercapture', (event) => {
        pointers.delete(event.pointerId);
        pointerHeld = pointers.size > 0;
    });
    canvas.addEventListener('pointerleave', () => {
        if (!pointerHeld) leave();
    });
    canvas.addEventListener(
        'wheel',
        (event) => {
            if (!interactive) return;
            event.preventDefault();
            const before = { interacted, coast };
            takeControl();
            zoom = Math.max(0.45, Math.min(8, zoom * Math.exp(-event.deltaY * 0.0015)));
            interacted = before.interacted;
            coast = before.coast;
            emitView();
        },
        { passive: false },
    );
    canvas.addEventListener('keydown', (event) => {
        if (!interactive) return;
        const key = event.key;
        if (
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(key)
        ) {
            event.preventDefault();
            takeControl();
            if (key === 'Home') fit();
            else if (key === '+' || key === '=') zoom = Math.min(8, zoom + 0.2);
            else if (key === '-') zoom = Math.max(0.45, zoom - 0.2);
            else
                rotate(
                    key === 'ArrowLeft' ? -20 : key === 'ArrowRight' ? 20 : 0,
                    key === 'ArrowUp' ? 15 : key === 'ArrowDown' ? -15 : 0,
                );
            emitView();
        }
    });
    window.addEventListener('blur', clearGestures);
    document.addEventListener('visibilitychange', () => {
        clearGestures();
        recenter = null;
    });
    function project(lat: number, lon: number): Vector {
        const phi = rad(lat),
            lambda = rad(lon - centerLon),
            center = rad(centerLat);
        const east = Math.cos(phi) * Math.sin(lambda),
            up =
                Math.cos(center) * Math.sin(phi) -
                Math.sin(center) * Math.cos(phi) * Math.cos(lambda),
            roll = rad(cameraRoll);
        return [
            east * Math.cos(roll) - up * Math.sin(roll),
            up * Math.cos(roll) + east * Math.sin(roll),
            Math.sin(center) * Math.sin(phi) + Math.cos(center) * Math.cos(phi) * Math.cos(lambda),
        ];
    }
    function fit(): void {
        const mapped = stops.filter((s) => s.lat !== null && s.lon !== null);
        if (!mapped.length) {
            status.textContent = t('No mapped route to fit.');
            return;
        }
        recenter = null;
        cameraRoll = 0;
        clearCursor();
        entryCentered = true;
        zoom = 1;
        if (mapped.length) {
            const sum = mapped.reduce<Vector>(
                (acc, s) => {
                    const v = vector(s.lat!, s.lon!);
                    return [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]];
                },
                [0, 0, 0],
            );
            const length = Math.hypot(...sum);
            const center =
                length < 1e-6
                    ? [mapped[0]!.lat!, mapped[0]!.lon!]
                    : latLon([sum[0] / length, sum[1] / length, sum[2] / length]);
            centerLat = Math.max(-75, Math.min(75, center[0]!));
            centerLon = center[1]!;
        } else {
            centerLat = 18;
            centerLon = 12;
        }
        dirty = true;
        status.textContent = t('Planned route fitted on the background globe.');
    }
    let overlaySpace = '';
    function draw(timestamp: number): void {
        const drawStarted = performance.now();
        canvas.dataset.phase = phase;
        canvas.dataset.longitude = centerLon.toFixed(3);
        canvas.dataset.latitude = centerLat.toFixed(3);
        canvas.dataset.zoom = zoom.toFixed(3);
        canvas.dataset.inputFit = viewportFitZoom().toFixed(3);
        canvas.dataset.scene = night ? 'night' : 'day';
        canvas.dataset.landRings = String(polygons.length);
        canvas.dataset.motionPaused = String(motionPaused);
        canvas.dataset.dragDegreesPerPixel = Math.max(
            0.01,
            Math.min(
                0.28,
                (MANUAL_GAIN * 180) /
                    (Math.PI * Math.max(1, Math.min(width * 0.38, height * 0.405) * zoom)),
            ),
        ).toFixed(5);
        canvas.dataset.cursorSpeed = '0';
        canvas.dataset.mode = interactive ? 'globe' : 'input';
        canvas.dataset.inputSpeed = String(INPUT_IDLE);
        canvas.dataset.pitch = String(centerLat);
        canvas.dataset.roll = String(cameraRoll);
        canvas.dataset.coasting = String(coast !== null);
        canvas.dataset.coastDuration = String(coast?.duration ?? 0);
        canvas.dataset.coastSpeed = String(coast ? Math.hypot(...coast.velocity) : 0);
        canvas.dataset.pointerZone = exposed ? 'background' : 'panel-or-outside';
        canvas.dataset.idleScale = '1';
        canvas.dataset.idleDirection = JSON.stringify(idleDirection);
        canvas.dataset.recenterCount = String(recenterCount);
        canvas.dataset.recentering = String(recenter !== null);
        canvas.dataset.rippleActive = String(
            interactive && exposed && cursor !== null && !reduced && !motionPaused,
        );
        context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
        context.clearRect(0, 0, width, height);
        const bounds = canvas.getBoundingClientRect(),
            local = (x: number, y: number): Point => [
                ((x - bounds.left) * width) / bounds.width,
                ((y - bounds.top) * height) / bounds.height,
            ];
        const cx = width / 2,
            cy = height / 2 - 6;
        const radius = Math.min(width * 0.38, height * 0.405) * zoom;
        const sideSpace = Math.max(0, Math.floor(cx - radius - 32)) + 'px';
        if (sideSpace !== overlaySpace) {
            overlaySpace = sideSpace;
            requestAnimationFrame(() =>
                document.documentElement.style.setProperty('--globe-side-space', overlaySpace),
            );
        }
        const pixel = (p: Vector, elevation = 1): Point => [
            cx + p[0] * radius * elevation,
            cy - p[1] * radius * elevation,
        ];
        const atmosphere = context.createRadialGradient(
            cx,
            cy,
            radius * 0.8,
            cx,
            cy,
            radius * 1.16,
        );
        atmosphere.addColorStop(0, '#20394800');
        atmosphere.addColorStop(0.84, '#65dce422');
        atmosphere.addColorStop(1, '#28445100');
        context.fillStyle = atmosphere;
        context.beginPath();
        context.arc(cx, cy, radius * 1.16, 0, Math.PI * 2);
        context.fill();
        const ocean = context.createRadialGradient(
            cx - radius * 0.35,
            cy - radius * 0.45,
            0,
            cx,
            cy,
            radius,
        );
        ocean.addColorStop(0, night ? '#284c61' : '#78d9e0');
        ocean.addColorStop(0.75, night ? '#1b4056' : '#32aac3');
        ocean.addColorStop(1, night ? '#112839' : '#167ba9');
        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.fillStyle = ocean;
        context.fill();
        context.save();
        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.clip();
        context.strokeStyle = '#5f84982a';
        context.lineWidth = 0.7;
        // True geographic meridians and parallels.
        for (let longitude = -180; longitude < 180; longitude += 30) {
            context.beginPath();
            let started = false;
            for (let latitude = -90; latitude <= 90; latitude += 3) {
                const p = project(latitude, longitude);
                if (p[2] <= 0) {
                    started = false;
                    continue;
                }
                const xy = pixel(p);
                if (!started) context.moveTo(...xy);
                else context.lineTo(...xy);
                started = true;
            }
            context.stroke();
        }
        for (let latitude = -60; latitude <= 60; latitude += 30) {
            context.beginPath();
            let started = false;
            for (let longitude = -180; longitude <= 180; longitude += 3) {
                const p = project(latitude, longitude);
                if (p[2] <= 0) {
                    started = false;
                    continue;
                }
                const xy = pixel(p);
                if (!started) context.moveTo(...xy);
                else context.lineTo(...xy);
                started = true;
            }
            context.stroke();
        }
        context.fillStyle = night ? '#366f64' : '#48ab88';
        context.strokeStyle = '#e1efc58a';
        context.lineWidth = 0.65;
        // Clip spherical rings at the actual horizon and reconnect boundary arcs.
        // Clamping hidden vertices onto the rim could fill the ocean at some yaw angles.
        landProjection
            .rotate([-centerLon, -centerLat, cameraRoll])
            .scale(radius)
            .translate([cx, cy]);
        for (const shape of landShapes) {
            context.beginPath();
            landPath(shape);
            context.fill();
            context.stroke();
        }
        // Licensed ecoregion boundaries describe forest/woodland biomes, not live canopy cover.
        const vegetationColors = night
            ? ['', '#255648', '#426953', '#356951', '#3e705a', '#365f54', '#365b50', '#759078']
            : ['', '#207551', '#4e965d', '#368d5b', '#5b9965', '#397b5b', '#52866a', '#7ba272'];
        const vegetationGroups = new Map<number, Point[][][]>();
        let visibleVegetation = 0;
        for (const feature of vegetation) {
            if (
                feature.radius < Math.PI / 2 &&
                project(...feature.center)[2] < -Math.sin(feature.radius)
            )
                continue;
            const color = feature.biome === 12 || feature.biome === 14 ? 7 : feature.biome,
                group = vegetationGroups.get(color) || [];
            group.push(feature.geometry.coordinates);
            vegetationGroups.set(color, group);
            visibleVegetation++;
        }
        for (const [color, coordinates] of vegetationGroups) {
            context.fillStyle = vegetationColors[color] || vegetationColors[1]!;
            context.beginPath();
            landPath({ type: 'MultiPolygon', coordinates });
            context.fill();
        }
        canvas.dataset.visibleVegetation = String(visibleVegetation);
        context.strokeStyle = night ? '#81b9c4ad' : '#b4edf4c9';
        context.lineWidth = zoom > 2 ? 1.15 : 0.8;
        context.lineCap = 'round';
        for (const river of rivers) {
            context.beginPath();
            landPath(river);
            context.stroke();
        }
        canvas.dataset.vegetationFeatures = String(vegetation.length);
        canvas.dataset.riverFeatures = String(rivers.length);
        canvas.dataset.vegetationSource = 'RESOLVE Ecoregions 2017 (generalized biomes)';
        canvas.dataset.riverSource = 'Natural Earth 1:110m river centerlines';
        context.strokeStyle = night ? '#b9d0ac80' : '#234e4580';
        context.lineWidth = zoom > 2 ? 0.8 : 0.55;
        if (zoom >= 0.7)
            for (const boundary of boundaries) {
                context.beginPath();
                landPath(boundary);
                context.stroke();
            }
        canvas.dataset.boundaryFeatures = String(boundaries.length);
        context.restore();
        const arc = simulatedArcWindow(simulationTime, reduced, simulationDrawMs),
            glow = simulationGlow(simulationTime, reduced, simulationDrawMs);
        canvas.dataset.simulationDrawMs = simulationDrawMs.toFixed(1);
        canvas.dataset.simulationCycleMs = ((simulationDrawMs * 11000) / 4800).toFixed(1);
        canvas.dataset.simulationBreathMs = (simulationDrawMs * 1.5).toFixed(1);
        canvas.dataset.simulationGlow = glow.toFixed(4);
        canvas.dataset.simulationEnabled = String(!!simulation);
        canvas.dataset.simulationVisible = String(interactive && !!simulation);
        canvas.dataset.simulationRoute = simulation?.id ?? '';
        canvas.dataset.simulationPhase = arc.phase;
        canvas.dataset.simulationStart = arc.start.toFixed(4);
        canvas.dataset.simulationEnd = arc.end.toFixed(4);
        canvas.dataset.simulationTime = simulationTime.toFixed(0);
        if (interactive && simulation) {
            const from: Point = [simulation.origin.lat, simulation.origin.lon],
                to: Point = [simulation.destination.lat, simulation.destination.lon];
            context.save();
            context.lineCap = 'round';
            context.beginPath();
            let started = false;
            if (arc.end > arc.start)
                for (let i = 0; i <= 120; i++) {
                    const progress = arc.start + ((arc.end - arc.start) * i) / 120,
                        p = project(...routePoint(from, to, progress));
                    if (p[2] < 0) {
                        started = false;
                        continue;
                    }
                    const xy = pixel(p, 1 + 0.1 * Math.sin(Math.PI * progress));
                    if (!started) context.moveTo(...xy);
                    else context.lineTo(...xy);
                    started = true;
                }
            context.globalAlpha = 0.1 + 0.22 * glow;
            context.strokeStyle = '#b37aff';
            context.lineWidth = 5 + glow * 9;
            context.shadowColor = '#b37aff';
            context.shadowBlur = 18 + glow * 30;
            context.stroke();
            context.globalAlpha = glow;
            context.strokeStyle = '#fff0ff';
            context.lineWidth = 1.8 + glow * 1.4;
            context.shadowColor = '#d5a3ff';
            context.shadowBlur = 12 + glow * 20;
            context.stroke();
            context.globalAlpha = 1;
            context.shadowBlur = 0;
            for (const endpoint of [from, to]) {
                const p = project(...endpoint);
                if (p[2] < 0) continue;
                const xy = pixel(p);
                context.beginPath();
                context.arc(...xy, 4, 0, Math.PI * 2);
                context.fillStyle = '#e2c6ff';
                context.fill();
                context.lineWidth = 1;
                context.strokeStyle = '#632d9f';
                context.stroke();
            }
            context.restore();
        }
        const visibleLabels: string[] = [];
        context.font = '600 12px system-ui';
        const reservedRouteBoxes = stops.flatMap((stop, index) => {
            if (stop.lat === null || stop.lon === null) return [];
            const p = project(stop.lat, stop.lon);
            if (p[2] < 0) return [];
            const [x, y] = pixel(p),
                textWidth = context.measureText(
                    String(index + 1) + '. ' + stop.name.slice(0, 22),
                ).width;
            const labelX = Math.min(width - textWidth - 20, Math.max(12, x + 13)),
                labelY = Math.max(26, Math.min(height - 14, y - 12 + (index % 3) * 19));
            return [{ x: labelX - 8, y: labelY - 15, width: textWidth + 16, height: 29 }];
        });
        if (blockerDirty) {
            blockers = Array.from(
                document.querySelectorAll(
                    interactive
                        ? '#globe-dock>button,#globe-dock>.dock-status,#simulated-route-badge:not([hidden]),#simulated-route-panel:not([hidden]),.form-popup:not([hidden]),.explore-tooltip,#globe-cities-trigger,.globe-cities-panel:not([hidden])'
                        : '.masthead,.paper,.globe-panel,.source-notes,footer,dialog[open]',
                ),
            )
                .filter(
                    (e) =>
                        !e.closest('#city-horizon') ||
                        e.closest('#city-horizon')!.classList.contains('map-eligible'),
                )
                .map((e) => e.getBoundingClientRect())
                .filter((b) => b.width > 0 && b.height > 0);
            blockerDirty = false;
            canvas.dataset.blockerBoxes = JSON.stringify(
                blockers.map((b) => ({ x: b.x, y: b.y, width: b.width, height: b.height })),
            );
        }
        {
            const boxes: { x: number; y: number; width: number; height: number }[] = [];
            const continentBoxes: {
                x: number;
                y: number;
                width: number;
                height: number;
                text: string;
                depth: number;
            }[] = [];
            const continentFont = Math.max(26, Math.min(36, 30 * Math.sqrt(Math.max(0.75, zoom))));
            context.save();
            context.font = `600 ${continentFont}px "Segoe UI","Microsoft JhengHei",sans-serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            for (const continent of [...continentLabels].sort(
                (a, b) => project(b.lat, b.lon)[2] - project(a.lat, a.lon)[2],
            )) {
                const projected = project(continent.lat, continent.lon);
                if (projected[2] < 0.3) continue;
                const [x, y] = pixel(projected),
                    name = currentLanguage() === 'en' ? continent.name : continent.zh;
                const box = {
                    x: x - context.measureText(name).width / 2 - 6,
                    y: y - continentFont * 0.65,
                    width: context.measureText(name).width + 12,
                    height: continentFont * 1.3,
                    text: name,
                    depth: projected[2],
                };
                if (
                    box.x < 8 ||
                    box.y < 8 ||
                    box.x + box.width > width - 8 ||
                    box.y + box.height > height - 8
                )
                    continue;
                const overlap = (other: { x: number; y: number; width: number; height: number }) =>
                    box.x < other.x + other.width + 8 &&
                    box.x + box.width + 8 > other.x &&
                    box.y < other.y + other.height + 8 &&
                    box.y + box.height + 8 > other.y;
                if (
                    continentBoxes.some(overlap) ||
                    blockers.some(overlap) ||
                    reservedRouteBoxes.some(overlap)
                )
                    continue;
                continentBoxes.push(box);
                context.globalAlpha = Math.min(1, (projected[2] - 0.3) / 0.25);
                context.lineJoin = 'round';
                context.lineWidth = 3;
                context.strokeStyle = night ? '#102638e8' : '#fff6ded9';
                context.strokeText(name, x, y);
                context.fillStyle = night ? '#e5edf1' : '#1e5142';
                context.fillText(name, x, y);
            }
            context.restore();
            canvas.dataset.continentLabels = JSON.stringify(continentBoxes.map((b) => b.text));
            canvas.dataset.continentLabelBoxes = JSON.stringify(continentBoxes);
            canvas.dataset.continentFontSize = String(continentFont);
            canvas.dataset.continentConvention =
                'seven: Asia,Africa,North America,South America,Antarctica,Europe,Oceania';
            boxes.push(...continentBoxes);

            const cityClocks: { code: string; name: string; zone: string; time: string }[] = [];
            const countryNames = new Intl.DisplayNames(
                [currentLanguage() === 'en' ? 'en' : 'zh-Hant'],
                { type: 'region' },
            );
            context.font = '500 13px "Segoe UI","Microsoft JhengHei",sans-serif';
            for (const place of interactive ? places : places.slice(0, majorCount)) {
                const projected = project(place.lat, place.lon);
                if (projected[2] < 0.22) continue;
                const [x, y] = pixel(projected);
                const caption = geographyLabels[place.code]!;
                const city = caption[currentLanguage() === 'en' ? 0 : 1];
                const country = countryNames.of(place.country) || place.country;
                const name = city === country ? city : city + ' · ' + country;
                const time = cityLocalTime(place.code, currentLanguage()),
                    box = {
                        x: x + 9,
                        y: y - (time ? 32 : 20),
                        width:
                            Math.max(
                                context.measureText(name).width,
                                time ? context.measureText(time).width : 0,
                            ) + 10,
                        height: time ? 43 : 25,
                    };
                if (
                    box.x < 8 ||
                    box.y < 8 ||
                    box.x + box.width > width - 8 ||
                    box.y + box.height > height - 8
                )
                    continue;
                const overlaps = (other: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }): boolean =>
                    box.x < other.x + other.width + 8 &&
                    box.x + box.width + 8 > other.x &&
                    box.y < other.y + other.height + 6 &&
                    box.y + box.height + 6 > other.y;
                if (
                    boxes.some(overlaps) ||
                    blockers.some(overlaps) ||
                    reservedRouteBoxes.some(overlaps)
                )
                    continue;
                boxes.push(box);
                visibleLabels.push(name);
                context.save();
                context.globalAlpha = Math.min(1, (projected[2] - 0.22) / 0.25);
                context.fillStyle = night ? '#263e52ed' : '#fff5dbea';
                context.strokeStyle = night ? '#baa9d477' : '#d0bd87aa';
                context.lineWidth = 0.6;
                context.beginPath();
                context.roundRect(box.x, box.y, box.width, box.height, 6);
                context.fill();
                context.stroke();
                context.beginPath();
                context.moveTo(box.x + 3, box.y + box.height - 7);
                context.lineTo(box.x - 5, box.y + box.height + 1);
                context.lineTo(box.x + 9, box.y + box.height - 1);
                context.fill();
                context.fillStyle = night ? '#f5ecd9' : '#204d43';
                context.fillText(name, box.x + 5, box.y + 17);
                if (time) {
                    context.save();
                    context.font = '500 11px system-ui';
                    context.globalAlpha *= 0.85;
                    context.fillText(time, box.x + 5, box.y + 34);
                    context.restore();
                    cityClocks.push({
                        code: place.code,
                        name: city,
                        zone: cityTimezones[place.code]!,
                        time,
                    });
                }
                context.fillStyle = '#d3b87e';
                context.beginPath();
                context.arc(x, y, 2, 0, Math.PI * 2);
                context.fill();
                context.restore();
                if (boxes.length >= (interactive ? Math.min(48, Math.round(12 + zoom * 6)) : 12))
                    break;
            }
            canvas.dataset.labelBoxes = JSON.stringify(boxes);
            canvas.dataset.cityLabelTimes = JSON.stringify(cityClocks);
            canvas.dataset.cityNameFontSize = '13';
            canvas.dataset.cityTimeFontSize = '11';
        }
        canvas.dataset.placeLabels = JSON.stringify(visibleLabels);
        // Orbit rim and equatorial ticks are decorative, not map data.
        context.strokeStyle = '#97b9c035';
        context.lineWidth = 1;
        context.beginPath();
        context.arc(cx, cy, radius + 9, 0, Math.PI * 2);
        context.stroke();
        for (let i = 0; i < 60; i++) {
            const angle = (i * Math.PI) / 30;
            context.beginPath();
            context.moveTo(
                cx + Math.cos(angle) * (radius + 11),
                cy + Math.sin(angle) * (radius + 11),
            );
            context.lineTo(
                cx + Math.cos(angle) * (radius + (i % 5 ? 14 : 18)),
                cy + Math.sin(angle) * (radius + (i % 5 ? 14 : 18)),
            );
            context.stroke();
        }
        const pulse = reduced || motionPaused ? 0.85 : 0.72 + 0.28 * Math.sin(timestamp / 1100);
        let segments = 0;
        for (let index = 1; index < stops.length; index++) {
            const a = stops[index - 1]!,
                b = stops[index]!;
            if (
                a.lat === null ||
                a.lon === null ||
                b.lat === null ||
                b.lon === null ||
                distanceKm(a.lat, a.lon, b.lat, b.lon) < 0.01
            )
                continue;
            segments++;
            context.beginPath();
            let started = false;
            for (let i = 0; i <= 100; i++) {
                const t = i / 100;
                const ll = routePoint([a.lat, a.lon], [b.lat, b.lon], t);
                const p = project(...ll);
                if (p[2] < 0) {
                    started = false;
                    continue;
                }
                const xy = pixel(p, 1 + 0.14 * Math.sin(t * Math.PI));
                if (!started) context.moveTo(...xy);
                else context.lineTo(...xy);
                started = true;
            }
            context.strokeStyle = `rgba(255,179,66,${pulse})`;
            context.lineWidth = 2.3;
            context.shadowColor = '#ffae3b';
            context.shadowBlur = 12 * pulse;
            context.stroke();
            context.shadowBlur = 0;
        }
        canvas.dataset.routeSegments = String(segments);
        canvas.dataset.routeMarkers = String(stops.filter((s) => s.lat !== null).length);
        const routeLabelBoxes: { x: number; y: number; width: number; height: number }[] = [];
        stops.forEach((stop, index) => {
            if (stop.lat === null || stop.lon === null) return;
            const p = project(stop.lat, stop.lon);
            if (p[2] < 0) return;
            const [x, y] = pixel(p);
            context.strokeStyle = `rgba(255,180,63,${pulse * 0.75})`;
            context.lineWidth = 1;
            context.beginPath();
            context.arc(x, y, 8 + 3 * pulse, 0, Math.PI * 2);
            context.stroke();
            context.fillStyle = '#ffd18a';
            context.beginPath();
            context.arc(x, y, 3.5, 0, Math.PI * 2);
            context.fill();
            context.font = '600 12px system-ui';
            const text = String(index + 1) + '. ' + stop.name.slice(0, 22);
            const textWidth = context.measureText(text).width;
            const labelX = Math.min(width - textWidth - 20, Math.max(12, x + 13)),
                labelY = Math.max(26, Math.min(height - 14, y - 12 + (index % 3) * 19));
            const box = { x: labelX - 8, y: labelY - 15, width: textWidth + 16, height: 24 };
            if (
                blockers.some(
                    (b) =>
                        box.x < b.right &&
                        box.x + box.width > b.left &&
                        box.y < b.bottom &&
                        box.y + box.height > b.top,
                )
            )
                return;
            if (
                routeLabelBoxes.some(
                    (b) =>
                        box.x < b.x + b.width &&
                        box.x + box.width > b.x &&
                        box.y < b.y + b.height &&
                        box.y + box.height > b.y,
                )
            )
                return;
            routeLabelBoxes.push(box);
            context.fillStyle = night ? '#644b68ee' : '#ffe3b3f5';
            context.beginPath();
            context.roundRect(box.x, box.y, box.width, box.height, 9);
            context.fill();
            context.strokeStyle = night ? '#d9abbc' : '#dba16a';
            context.lineWidth = 1;
            context.stroke();
            context.beginPath();
            context.moveTo(box.x + 10, box.y + box.height - 1);
            context.lineTo(box.x + 13, box.y + box.height + 5);
            context.lineTo(box.x + 18, box.y + box.height - 1);
            context.fill();
            context.fillStyle = night ? '#fff0d4' : '#67462d';
            context.fillText(text, labelX, labelY + 2);
        });
        canvas.dataset.routeLabelBoxes = JSON.stringify(routeLabelBoxes);
        if (interactive && exposed && cursor && !reduced && !motionPaused) {
            context.save();
            const clip = new Path2D();
            clip.rect(0, 0, width, height);
            for (const box of blockers) {
                const [x, y] = local(box.x, box.y);
                clip.rect(
                    x,
                    y,
                    (box.width * width) / bounds.width,
                    (box.height * height) / bounds.height,
                );
            }
            context.clip(clip, 'evenodd');
            context.lineWidth = 1.25;
            for (let i = 0; i < 2; i++) {
                const progress = ((timestamp + i * 800) % 1600) / 1600;
                context.strokeStyle =
                    (night ? 'rgba(213,187,255,' : 'rgba(104,63,156,') +
                    (night ? 0.78 : 0.68) * (1 - progress) +
                    ')';
                const [x, y] = local(cursor.x, cursor.y);
                canvas.dataset.rippleCenter = JSON.stringify({
                    x,
                    y,
                    clientX: cursor.x,
                    clientY: cursor.y,
                });
                context.beginPath();
                context.arc(x, y, 5 + progress * 52, 0, Math.PI * 2);
                context.stroke();
            }
            context.restore();
        }
        canvas.dataset.drawCount = String(++drawCount);
        canvas.dataset.drawMs = (performance.now() - drawStarted).toFixed(2);
    }
    function tick(timestamp: number): void {
        const minute = Math.floor(Date.now() / 60000);
        if (minute !== clockMinute) {
            clockMinute = minute;
            dirty = true;
        }
        const delta = Math.min(80, timestamp - lastTick);
        lastTick = timestamp;
        if (visible && !document.hidden) {
            if (interactive && simulation && !reduced) {
                simulationTime += delta;
                dirty = true;
            }
            if (zoomTween) {
                const progress =
                        reduced || motionPaused
                            ? 1
                            : Math.min(1, (timestamp - zoomTween.started) / 360),
                    ease = progress * progress * (3 - 2 * progress);
                zoom = zoomTween.from + (zoomTween.to - zoomTween.from) * ease;
                if (progress === 1) zoomTween = null;
                dirty = true;
            }
            if (phase === 'background' && ((!reduced && !motionPaused) || recenter)) {
                if (recenter) {
                    const progress = Math.min(1, (timestamp - recenter.started) / 550),
                        ease = progress * progress * (3 - 2 * progress);
                    cameraRoll = recenter.roll + recenter.deltaRoll * ease;
                    centerLat = recenter.lat + (recenter.targetLat - recenter.lat) * ease;
                    centerLon = recenter.lon + recenter.deltaLon * ease;
                    if (progress === 1) {
                        recenter = null;
                        emitView();
                    }
                } else if (!reduced && !motionPaused) {
                    if (!interactive) turn((INPUT_IDLE * delta) / 1000, 0);
                    else if (!interacted && !pointerHeld) {
                        const rate = GLOBE_IDLE;
                        let velocity: Point = [idleDirection[0] * rate, idleDirection[1] * rate];
                        if (coast) {
                            const progress = Math.min(
                                    1,
                                    (timestamp - coast.started) / coast.duration,
                                ),
                                ease = progress * progress * (3 - 2 * progress);
                            velocity = [
                                coast.velocity[0] * (1 - ease) + velocity[0] * ease,
                                coast.velocity[1] * (1 - ease) + velocity[1] * ease,
                            ];
                            if (progress === 1) {
                                coast = null;
                                emitView();
                            }
                        }
                        turn((velocity[0] * delta) / 1000, (velocity[1] * delta) / 1000);
                    }
                }
                dirty = true;
            }
            if (
                timestamp - previousFrame > 33 &&
                (dirty || (!reduced && !motionPaused && stops.length > 1))
            ) {
                draw(timestamp);
                dirty = false;
                previousFrame = timestamp;
            }
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    new ResizeObserver((entries) => {
        const bounds = entries[0]?.contentRect;
        if (!bounds) return;
        width = bounds.width;
        height = bounds.height;
        if (!interactive) fitInput();
        dpr = Math.min(devicePixelRatio || 1, 1.5);
        const pixelWidth = Math.round(width * dpr),
            pixelHeight = Math.round(height * dpr);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
            // Resizing clears the bitmap: redraw in the same observer delivery,
            // without leaving a blank canvas until the next throttled animation tick.
            draw(performance.now());
            previousFrame = performance.now();
        }
        dirty = true;
    }).observe(canvas);
    new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) dirty = true;
    }).observe(canvas);
    function control(id: string, action: () => void): void {
        document.getElementById(id)?.addEventListener('click', () => {
            action();
            dirty = true;
        });
    }
    const rotate = (lon: number, lat: number) => {
        recenter = null;
        clearCursor();
        entryCentered = true;
        remember(lon, lat);
        turn(lon, lat);
        status.textContent = `Globe rotated. Center ${Math.round(centerLat)}° latitude, ${Math.round(centerLon)}° longitude.`;
    };
    control('rotate-left', () => {
        if (interactive) rotate(-20, 0);
    });
    control('rotate-right', () => {
        if (interactive) rotate(20, 0);
    });
    control('rotate-up', () => {
        if (interactive) rotate(0, 15);
    });
    control('rotate-down', () => {
        if (interactive) rotate(0, -15);
    });
    control('zoom-in', () => {
        if (!interactive) return;
        takeControl();
        zoom = Math.min(8, zoom + 0.2);
        status.textContent = `Globe zoom ${Math.round(zoom * 100)}%. This world map does not show street-level hotel detail.`;
    });
    control('zoom-out', () => {
        if (!interactive) return;
        takeControl();
        zoom = Math.max(0.45, zoom - 0.2);
        status.textContent = `Globe zoom ${Math.round(zoom * 100)}%.`;
    });
    const renderMotion = (): void => {
        const button = document.getElementById('globe-mode-motion')!;
        const stopped = motionPaused || reduced || interacted;
        document.body.classList.toggle('explore-motion-paused', stopped);
        button.setAttribute('aria-pressed', String(stopped));
        button.setAttribute('aria-label', t(stopped ? 'Resume motion' : 'Pause motion'));
        button.title = t(stopped ? 'Resume motion' : 'Pause motion');
        button.dataset.state = stopped ? 'paused' : 'rotating';
        button.querySelector('svg')!.innerHTML = stopped
            ? '<path d="m8 5 11 7-11 7z"/>'
            : '<path d="M8 5v14M16 5v14"/>';
    };
    control('globe-mode-motion', () => {
        if (reduced) {
            status.textContent = t('Motion follows your reduced-motion preference.');
            renderMotion();
            return;
        }
        if (motionPaused || interacted) {
            motionPaused = false;
            interacted = false;
        } else motionPaused = true;
        document.body.classList.toggle('motion-paused', motionPaused);
        clearCursor();
        recenter = null;
        coast = null;
        status.textContent = t(motionPaused ? 'Motion paused.' : 'Automatic rotation resumed.');
        renderMotion();
    });
    let retryDevice = false;
    const retryButton = document.getElementById('retry-device-location') as HTMLButtonElement;
    const renderDevice = (): void => {
        const info = getDeviceLocationStatus();
        retryButton.hidden = !info.attempted || info.state === 'success';
        retryButton.disabled = info.state === 'pending';
        const key =
            info.permissionAfter === 'unknown' ? info.permissionBefore : info.permissionAfter;
        document.getElementById('device-permission-status')!.textContent =
            t('Browser location permission') +
            ': ' +
            t(key) +
            '. ' +
            t(
                'Reset reuses this page’s device lookup. Retry device positioning requests it again.',
            );
    };
    window.addEventListener('roamnest-device-location-state', renderDevice);
    window.addEventListener('roamnest-language-change', renderDevice);
    renderDevice();
    control('retry-device-location', () => {
        retryDevice = true;
        document.getElementById('reset-location')!.click();
    });
    control('reset-location', () => {
        if (!interactive) return;
        const before = { interacted, coast };
        takeControl();
        interacted = before.interacted;
        coast = before.coast;
        renderMotion();
        const token = locationReset;
        const button = document.getElementById('reset-location') as HTMLButtonElement;
        button.disabled = true;
        status.textContent = t('Finding device location…');
        const force = retryDevice;
        retryDevice = false;
        void requestDeviceLocation(force)
            .then(async (area) => {
                let device = !!area;
                if (!area) {
                    status.textContent = t(
                        'Device location unavailable. Trying approximate IP area…',
                    );
                    area = await location.reset();
                }
                if (token !== locationReset || !interactive) return;
                if (!area) {
                    status.textContent = t('Location unavailable. Your current view is unchanged.');
                    return;
                }
                if (!reduced && !motionPaused) {
                    recenter = {
                        lat: centerLat,
                        lon: centerLon,
                        targetLat: area.lat,
                        deltaLon: longitudeDelta(centerLon, area.lon),
                        roll: cameraRoll,
                        deltaRoll: longitudeDelta(cameraRoll, 0),
                        started: performance.now(),
                    };
                    zoomTween = { from: zoom, to: viewportFitZoom(), started: performance.now() };
                } else {
                    cameraRoll = 0;
                    centerLat = area.lat;
                    centerLon = area.lon;
                    zoom = viewportFitZoom();
                    emitView();
                }
                dirty = true;
                renderMotion();
                status.textContent = t(
                    device
                        ? 'Centered on device location. Accuracy depends on your browser and device.'
                        : 'Centered on approximate IP area. VPNs may show another place.',
                );
            })
            .finally(() => {
                button.disabled = false;
                renderMotion();
            });
    });
    window.addEventListener('roamnest-language-change', renderMotion);
    motion.addEventListener('change', renderMotion);
    canvas.addEventListener('pointerdown', renderMotion);
    canvas.addEventListener('wheel', renderMotion);
    canvas.addEventListener('keydown', renderMotion);
    window.addEventListener('roamnest-mode-change', () => {
        renderMotion();
        if (interactive) emitView();
    });
    renderMotion();
    const renderScene = (): void => {
        const b = document.getElementById('scene-toggle')!;
        b.setAttribute('aria-pressed', String(night));
        b.setAttribute('aria-label', t(night ? 'Use daylight scene' : 'Use night scene'));
        b.title = b.getAttribute('aria-label')!;
    };
    control('scene-toggle', () => {
        night = !night;
        document.body.classList.toggle('scene-night', night);
        renderScene();
    });
    window.addEventListener('roamnest-language-change', renderScene);
    renderScene();
    void fetch('./data/country-boundaries.geojson')
        .then(async (r) => {
            if (!r.ok) throw new Error('boundaries');
            const data = await r.json();
            boundaries = data.features.map((f: { geometry: BoundaryShape }) => f.geometry);
            dirty = true;
        })
        .catch(() => {
            canvas.dataset.boundaryError = 'unavailable';
        });
    void fetch('./data/vegetation.geojson')
        .then(async (r) => {
            if (!r.ok) throw new Error('vegetation');
            const data = await r.json();
            vegetation = data.features.map(
                (f: {
                    geometry: GeoShape;
                    properties: { biome: number; center: Point; radius: number };
                }) => ({ geometry: f.geometry, ...f.properties }),
            );
            dirty = true;
        })
        .catch(() => {
            canvas.dataset.vegetationError = 'unavailable';
        });
    void fetch('./data/rivers.geojson')
        .then(async (r) => {
            if (!r.ok) throw new Error('rivers');
            const data = await r.json();
            rivers = data.features.map((f: { geometry: BoundaryShape }) => f.geometry);
            dirty = true;
        })
        .catch(() => {
            canvas.dataset.riverError = 'unavailable';
        });
    fetch('./data/land.geojson')
        .then(async (response) => {
            if (!response.ok) throw new Error('Map unavailable');
            const data = (await response.json()) as Land;
            polygons = data.features.flatMap((f) =>
                f.geometry.type === 'Polygon'
                    ? (f.geometry.coordinates as Point[][]).slice(0, 1)
                    : (f.geometry.coordinates as Point[][][]).map((p) => p[0]!).filter(Boolean),
            );
            // D3 uses clockwise exterior rings on the sphere; normalize small land polygons.
            landShapes = polygons.map((ring) => {
                const shape: GeoShape = { type: 'Polygon', coordinates: [ring] };
                return geo.geoArea(shape) > 2 * Math.PI
                    ? { type: 'Polygon', coordinates: [[...ring].reverse()] }
                    : shape;
            });
            dirty = true;
        })
        .catch(() => {
            status.textContent =
                'World geometry unavailable. Coordinate markers, rotation and search tools still work.';
        });
    const setStops = (next: Stop[]): void => {
        if (stops.length && !next.length && !interactive) fitInput();
        stops = next.map((s) => ({ ...s }));
        dirty = true;
        blockerDirty = true;
    };
    const renderReset = (): void => {
        const button = document.getElementById('reset-location')!;
        button.title = t('Locate');
        button.setAttribute('aria-label', t('Locate'));
    };
    window.addEventListener('roamnest-language-change', renderReset);
    renderReset();
    initializeModes(canvas, changeMode);
    return {
        setSimulation: (route) => {
            if (simulation?.id !== route?.id) simulationTime = 0;
            simulation = route;
            simulationDrawMs = routeDrawDuration(route);
            dirty = true;
        },
        centerLabel: (lat, lon) => {
            if (
                !interactive ||
                !Number.isFinite(lat) ||
                !Number.isFinite(lon) ||
                Math.abs(lat) > 90 ||
                Math.abs(lon) > 180
            )
                return;
            locationReset++;
            entryCentered = true;
            clearCursor();
            if (reduced) {
                centerLat = lat;
                centerLon = lon;
                cameraRoll = 0;
                recenter = null;
                emitView();
            } else
                recenter = {
                    lat: centerLat,
                    lon: centerLon,
                    targetLat: lat,
                    deltaLon: longitudeDelta(centerLon, lon),
                    roll: cameraRoll,
                    deltaRoll: longitudeDelta(cameraRoll, 0),
                    started: performance.now(),
                };
            canvas.dataset.centerTarget = JSON.stringify({ lat, lon });
            dirty = true;
        },
        view: () => ({
            ...cameraCenter(centerLat, centerLon),
            moving: pointerHeld || recenter !== null || coast !== null,
        }),
        fit,
        setStops,
        focusRegion: (stop) => {
            if (phase === 'background' && stop.lat !== null && stop.lon !== null) {
                cameraRoll = 0;
                centerLat = Math.max(-65, Math.min(65, stop.lat));
                centerLon = stop.lon;
                recenter = null;
                clearCursor();
                entryCentered = true;
                dirty = true;
            }
        },
        setPlaces: (airports) => {
            const seen = new Set<string>();
            places = Object.keys(geographyLabels).flatMap((code) => {
                const a = airports.find((a) => a.code === code);
                if (!a) return [];
                const city = geographyLabels[code]![0] + '|' + a.country;
                if (seen.has(city)) return [];
                seen.add(city);
                return [a];
            });
            majorCount = places.length;
            canvas.dataset.majorLabels = String(majorCount);
            dirty = true;
            blockerDirty = true;
        },
        setRoute: (a, b) =>
            setStops(
                [a, b].flatMap((p, index) =>
                    p
                        ? [
                              {
                                  id: String(index),
                                  name: p.city,
                                  code: p.code,
                                  country: p.country,
                                  lat: p.lat,
                                  lon: p.lon,
                                  nights: 1,
                                  days: [''],
                                  pois: [],
                              },
                          ]
                        : [],
                ),
            ),
    };
}
