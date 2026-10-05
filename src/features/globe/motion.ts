export type Direction = [number, number];
export function normalizedDirection(lon: number, lat: number): Direction {
    const length = Math.hypot(lon, lat);
    return Number.isFinite(length) && length > 0.001 ? [lon / length, lat / length] : [1, 0];
}
export function longitudeDelta(from: number, to: number): number {
    return ((((to - from + 540) % 360) + 360) % 360) - 180;
}
export function advanceOrientation(
    lon: number,
    lat: number,
    lonSpeed: number,
    latSpeed: number,
    seconds: number,
): Direction {
    // Ease outward pitch near the poles, keeping orientation upright and continuous.
    const outward = lat * latSpeed > 0,
        factor = outward ? Math.max(0, 1 - (Math.abs(lat) / 85) ** 8) : 1;
    return [
        ((((lon + lonSpeed * seconds + 180) % 360) + 360) % 360) - 180,
        Math.max(-85, Math.min(85, lat + latSpeed * seconds * factor)),
    ];
}

export function wrapAngle(n: number): number {
    return ((((n + 180) % 360) + 360) % 360) - 180;
}
export function advanceFreeOrientation(
    lon: number,
    pitch: number,
    lonSpeed: number,
    pitchSpeed: number,
    seconds: number,
): Direction {
    return [wrapAngle(lon + lonSpeed * seconds), wrapAngle(pitch + pitchSpeed * seconds)];
}
export function cameraCenter(pitch: number, lon: number): { lat: number; lon: number } {
    const radians = (pitch * Math.PI) / 180;
    return {
        lat: (Math.asin(Math.sin(radians)) * 180) / Math.PI,
        lon: wrapAngle(lon + (Math.cos(radians) < 0 ? 180 : 0)),
    };
}

export type Camera = { lon: number; lat: number; roll: number };
type Axis = [number, number, number];
const dot = (a: Axis, b: Axis): number => a.reduce((sum, n, i) => sum + n * b[i]!, 0);
export function cameraBasis(camera: Camera): [Axis, Axis, Axis] {
    const r = Math.PI / 180,
        l = camera.lon * r,
        p = camera.lat * r,
        g = camera.roll * r;
    const east: Axis = [-Math.sin(l), Math.cos(l), 0],
        up: Axis = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
    return [
        east.map((n, i) => n * Math.cos(g) - up[i]! * Math.sin(g)) as Axis,
        up.map((n, i) => n * Math.cos(g) + east[i]! * Math.sin(g)) as Axis,
        [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)],
    ];
}
export function rotateCamera(camera: Camera, yaw: number, pitch: number): Camera {
    let [right, up, front] = cameraBasis(camera);
    const a = (yaw * Math.PI) / 180,
        b = (pitch * Math.PI) / 180;
    const nextRight = right.map((n, i) => n * Math.cos(a) - front[i]! * Math.sin(a)) as Axis;
    front = front.map((n, i) => n * Math.cos(a) + right[i]! * Math.sin(a)) as Axis;
    right = nextRight;
    const nextUp = up.map((n, i) => n * Math.cos(b) - front[i]! * Math.sin(b)) as Axis;
    front = front.map((n, i) => n * Math.cos(b) + up[i]! * Math.sin(b)) as Axis;
    up = nextUp;
    const lon =
        Math.hypot(front[0], front[1]) < 1e-10
            ? camera.lon
            : (Math.atan2(front[1], front[0]) * 180) / Math.PI;
    const lat = (Math.asin(Math.max(-1, Math.min(1, front[2]))) * 180) / Math.PI;
    const [east, baseUp] = cameraBasis({ lon, lat, roll: 0 });
    return {
        lon: wrapAngle(lon),
        lat,
        roll: (Math.atan2(dot(up, east), dot(up, baseUp)) * 180) / Math.PI,
    };
}
