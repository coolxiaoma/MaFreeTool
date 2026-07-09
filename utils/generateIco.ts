export const ICO_SIZES = [16, 32, 48, 64, 128, 256, 512] as const;
export type IcoSize = (typeof ICO_SIZES)[number];

export const ICO_RADIUS_PRESETS = [0, 10, 20, 30, 40, 60, 100] as const;
export type IcoRadius = (typeof ICO_RADIUS_PRESETS)[number];

export interface CropRect {
    x: number;
    y: number;
    size: number;
}

export const createDefaultCrop = (width: number, height: number): CropRect => {
    const size = Math.min(width, height);
    return {
        x: (width - size) / 2,
        y: (height - size) / 2,
        size,
    };
};

export const clampCrop = (crop: CropRect, width: number, height: number): CropRect => {
    const size = Math.max(1, Math.min(crop.size, width, height));
    const x = Math.max(0, Math.min(crop.x, width - size));
    const y = Math.max(0, Math.min(crop.y, height - size));
    return { x, y, size };
};

export const renderIconCanvas = (
    image: HTMLImageElement,
    crop: CropRect,
    outputSize: IcoSize,
    borderRadiusPercent: IcoRadius,
): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 上下文创建失败');

    ctx.clearRect(0, 0, outputSize, outputSize);

    const radius = (borderRadiusPercent / 100) * (outputSize / 2);
    if (radius > 0) {
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(outputSize - radius, 0);
        ctx.quadraticCurveTo(outputSize, 0, outputSize, radius);
        ctx.lineTo(outputSize, outputSize - radius);
        ctx.quadraticCurveTo(outputSize, outputSize, outputSize - radius, outputSize);
        ctx.lineTo(radius, outputSize);
        ctx.quadraticCurveTo(0, outputSize, 0, outputSize - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
    }

    ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.size,
        crop.size,
        0,
        0,
        outputSize,
        outputSize,
    );

    return canvas;
};

const canvasToPngBuffer = (canvas: HTMLCanvasElement): Promise<ArrayBuffer> =>
    new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('PNG 生成失败'));
                return;
            }
            blob.arrayBuffer().then(resolve).catch(reject);
        }, 'image/png');
    });

export const encodeIco = (pngBuffer: ArrayBuffer, width: number, height: number): Blob => {
    const headerSize = 6;
    const entrySize = 16;
    const offset = headerSize + entrySize;
    const pngBytes = new Uint8Array(pngBuffer);
    const totalSize = offset + pngBytes.length;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, 1, true);

    bytes[6] = width >= 256 ? 0 : width;
    bytes[7] = height >= 256 ? 0 : height;
    bytes[8] = 0;
    bytes[9] = 0;
    view.setUint16(10, 1, true);
    view.setUint16(12, 32, true);
    view.setUint32(14, pngBytes.length, true);
    view.setUint32(18, offset, true);

    bytes.set(pngBytes, offset);

    return new Blob([buffer], { type: 'image/x-icon' });
};

export const generateIcoBlob = async (
    image: HTMLImageElement,
    crop: CropRect,
    outputSize: IcoSize,
    borderRadiusPercent: IcoRadius,
): Promise<Blob> => {
    const canvas = renderIconCanvas(image, crop, outputSize, borderRadiusPercent);
    const pngBuffer = await canvasToPngBuffer(canvas);
    return encodeIco(pngBuffer, outputSize, outputSize);
};

export const generateIcoPreviewUrl = (
    image: HTMLImageElement,
    crop: CropRect,
    outputSize: IcoSize,
    borderRadiusPercent: IcoRadius,
): string => {
    const canvas = renderIconCanvas(image, crop, outputSize, borderRadiusPercent);
    return canvas.toDataURL('image/png');
};
