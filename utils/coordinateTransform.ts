/** 坐标系类型 */
export type CoordSystem = 'WGS84' | 'GCJ02' | 'BD09' | 'CGCS2000';

export interface LngLat {
    lng: number;
    lat: number;
}

export interface ProjectedCoord {
    east: number;
    north: number;
    band: number;
}

export interface ConvertResult {
    WGS84: LngLat;
    GCJ02: LngLat;
    BD09: LngLat;
    CGCS2000: ProjectedCoord;
}

const PI = Math.PI;
const X_PI = (PI * 3000.0) / 180.0;
const A = 6378245.0;
const EE = 0.00669342162296594323;

/** 中国 3 度分带号 25–45，对应中央经线 75°E–135°E */
export const CGCS2000_BANDS = Array.from({ length: 21 }, (_, i) => {
    const band = 25 + i;
    return { band, centralMeridian: band * 3 };
});

const outOfChina = (lng: number, lat: number) =>
    lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;

const transformLat = (lng: number, lat: number) => {
    let ret =
        -100.0 +
        2.0 * lng +
        3.0 * lat +
        0.2 * lat * lat +
        0.1 * lng * lat +
        0.2 * Math.sqrt(Math.abs(lng));
    ret +=
        ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
    ret +=
        ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0;
    ret +=
        ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) /
        3.0;
    return ret;
};

const transformLng = (lng: number, lat: number) => {
    let ret =
        300.0 +
        lng +
        2.0 * lat +
        0.1 * lng * lng +
        0.1 * lng * lat +
        0.1 * Math.sqrt(Math.abs(lng));
    ret +=
        ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
    ret +=
        ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0;
    ret +=
        ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) *
            2.0) /
        3.0;
    return ret;
};

export const wgs84ToGcj02 = (lng: number, lat: number): LngLat => {
    if (outOfChina(lng, lat)) return { lng, lat };
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = (lat / 180.0) * PI;
    let magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
    dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
    return { lng: lng + dLng, lat: lat + dLat };
};

export const gcj02ToWgs84 = (lng: number, lat: number): LngLat => {
    if (outOfChina(lng, lat)) return { lng, lat };
    const g = wgs84ToGcj02(lng, lat);
    return { lng: lng * 2 - g.lng, lat: lat * 2 - g.lat };
};

export const gcj02ToBd09 = (lng: number, lat: number): LngLat => {
    const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI);
    const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI);
    return { lng: z * Math.cos(theta) + 0.0065, lat: z * Math.sin(theta) + 0.006 };
};

export const bd09ToGcj02 = (lng: number, lat: number): LngLat => {
    const x = lng - 0.0065;
    const y = lat - 0.006;
    const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
    const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
    return { lng: z * Math.cos(theta), lat: z * Math.sin(theta) };
};

export const wgs84ToBd09 = (lng: number, lat: number): LngLat => {
    const g = wgs84ToGcj02(lng, lat);
    return gcj02ToBd09(g.lng, g.lat);
};

export const bd09ToWgs84 = (lng: number, lat: number): LngLat => {
    const g = bd09ToGcj02(lng, lat);
    return gcj02ToWgs84(g.lng, g.lat);
};

// CGCS2000 椭球参数（高斯-克吕格 3 度分带投影）
const CGCS_A = 6378137.0;
const CGCS_F = 1 / 298.257222101;
const CGCS_E2 = 2 * CGCS_F - CGCS_F * CGCS_F;
const CGCS_EP2 = CGCS_E2 / (1 - CGCS_E2);

/** 根据经度推断 3 度分带号（中国 25–45） */
export const inferBand3 = (lng: number): number => {
    let band = Math.round(lng / 3);
    if (band < 25) band = 25;
    if (band > 45) band = 45;
    return band;
};

/** 纬度对应的子午线弧长 */
const meridianArc = (B: number) => {
    const e2 = CGCS_E2;
    const a = CGCS_A;
    const A0 = 1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256;
    const A2 = (3 / 8) * (e2 + e2 * e2 / 4 + (15 * e2 * e2 * e2) / 128);
    const A4 = (15 / 256) * (e2 * e2 + (3 * e2 * e2 * e2) / 4);
    const A6 = (35 * e2 * e2 * e2) / 3072;
    return a * (A0 * B - A2 * Math.sin(2 * B) + A4 * Math.sin(4 * B) - A6 * Math.sin(6 * B));
};

/** WGS84 / CGCS2000 经纬度 → 高斯-克吕格投影坐标（近似：CGCS2000 与 WGS84 经纬度差为厘米级） */
export const lngLatToGaussKruger = (
    lng: number,
    lat: number,
    band?: number
): ProjectedCoord => {
    const b = band ?? inferBand3(lng);
    const L0 = (b * 3 * PI) / 180;
    const B = (lat * PI) / 180;
    const L = (lng * PI) / 180;
    const l = L - L0;

    const N = CGCS_A / Math.sqrt(1 - CGCS_E2 * Math.sin(B) * Math.sin(B));
    const t = Math.tan(B);
    const eta2 = CGCS_EP2 * Math.cos(B) * Math.cos(B);
    const X = meridianArc(B);
    const cosB = Math.cos(B);

    const east =
        N * cosB * l +
        (N * Math.pow(cosB, 3) * (1 - t * t + eta2) * Math.pow(l, 3)) / 6 +
        (N *
            Math.pow(cosB, 5) *
            (5 - 18 * t * t + Math.pow(t, 4) + 14 * eta2 - 58 * eta2 * t * t) *
            Math.pow(l, 5)) /
            120 +
        500000 +
        b * 1000000;

    const north =
        X +
        (N * t * Math.pow(cosB, 2) * Math.pow(l, 2)) / 2 +
        (N * t * Math.pow(cosB, 4) * (5 - t * t + 9 * eta2 + 4 * eta2 * eta2) * Math.pow(l, 4)) /
            24 +
        (N * t * Math.pow(cosB, 6) * (61 - 58 * t * t + Math.pow(t, 4)) * Math.pow(l, 6)) / 720;

    return { east, north, band: b };
};

/** 高斯-克吕格 → 经纬度 */
export const gaussKrugerToLngLat = (
    east: number,
    north: number,
    band: number
): LngLat => {
    const y = east - band * 1000000 - 500000;
    const x = north;
    const L0 = (band * 3 * PI) / 180;

    const e2 = CGCS_E2;
    const a = CGCS_A;
    const A0 = 1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256;
    let Bf = x / (a * A0);
    for (let i = 0; i < 8; i++) {
        const Mx = meridianArc(Bf);
        const dM = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(Bf) * Math.sin(Bf), 1.5);
        Bf += (x - Mx) / dM;
    }

    const tf = Math.tan(Bf);
    const cosBf = Math.cos(Bf);
    const Nf = a / Math.sqrt(1 - e2 * Math.sin(Bf) * Math.sin(Bf));
    const Mf = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(Bf) * Math.sin(Bf), 1.5);
    const etaf2 = CGCS_EP2 * cosBf * cosBf;
    const yN = y / Nf;

    const B =
        Bf -
        (tf * y * y) / (2 * Mf * Nf) +
        (tf * (5 + 3 * tf * tf + etaf2 - 9 * etaf2 * tf * tf) * Math.pow(y, 4)) /
            (24 * Mf * Math.pow(Nf, 3)) -
        (tf * (61 + 90 * tf * tf + 45 * Math.pow(tf, 4)) * Math.pow(y, 6)) /
            (720 * Mf * Math.pow(Nf, 5));

    const l =
        yN / cosBf -
        ((1 + 2 * tf * tf + etaf2) * Math.pow(yN, 3)) / (6 * cosBf) +
        ((5 + 28 * tf * tf + 24 * Math.pow(tf, 4) + 6 * etaf2 + 8 * etaf2 * tf * tf) *
            Math.pow(yN, 5)) /
            (120 * cosBf);

    return { lng: ((L0 + l) * 180) / PI, lat: (B * 180) / PI };
};

/** 统一转到 WGS84 经纬度 */
export const toWgs84 = (
    system: CoordSystem,
    x: number,
    y: number,
    band?: number
): LngLat => {
    switch (system) {
        case 'WGS84':
            return { lng: x, lat: y };
        case 'GCJ02':
            return gcj02ToWgs84(x, y);
        case 'BD09':
            return bd09ToWgs84(x, y);
        case 'CGCS2000': {
            if (band == null) throw new Error('CGCS2000 需要指定 3 度分带号');
            return gaussKrugerToLngLat(x, y, band);
        }
        default:
            return { lng: x, lat: y };
    }
};

/** 从任意坐标系转换到全部目标坐标系 */
export const convertAll = (
    system: CoordSystem,
    x: number,
    y: number,
    band?: number
): ConvertResult => {
    const wgs = toWgs84(system, x, y, band);
    const gcj = wgs84ToGcj02(wgs.lng, wgs.lat);
    const bd = gcj02ToBd09(gcj.lng, gcj.lat);
    const projected = lngLatToGaussKruger(wgs.lng, wgs.lat, band ?? inferBand3(wgs.lng));
    return {
        WGS84: wgs,
        GCJ02: gcj,
        BD09: bd,
        CGCS2000: projected,
    };
};

export const formatLngLat = (c: LngLat, digits = 8) =>
    `${c.lng.toFixed(digits)},${c.lat.toFixed(digits)}`;

export const formatProjected = (c: ProjectedCoord, digits = 3) =>
    `${c.east.toFixed(digits)},${c.north.toFixed(digits)},${c.band}`;

export const parseCoordPair = (text: string): { x: number; y: number } | null => {
    const parts = text
        .trim()
        .replace(/[，、]/g, ',')
        .split(/[\s,;]+/)
        .filter(Boolean);
    if (parts.length < 2) return null;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
};
