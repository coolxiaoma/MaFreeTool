import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    ICO_SIZES,
    ICO_RADIUS_PRESETS,
    IcoSize,
    IcoRadius,
    CropRect,
    createDefaultCrop,
    clampCrop,
    generateIcoBlob,
    generateIcoPreviewUrl,
} from '../utils/generateIco';

type DragMode = 'move' | 'resize' | null;

const ACCEPT_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

const IcoGeneratorTool: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, size: 0 });
    const [iconSize, setIconSize] = useState<IcoSize>(64);
    const [borderRadius, setBorderRadius] = useState<IcoRadius>(30);
    const [previewIcoUrl, setPreviewIcoUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState<DragMode>(null);

    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number; crop: CropRect } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageElementRef = useRef<HTMLImageElement | null>(null);

    const loadFile = useCallback((file: File) => {
        if (!ACCEPT_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
            setError('请选择 PNG / JPG / GIF / WebP 图片');
            return;
        }

        setSelectedFile(file);
        setError(null);
        setPreviewIcoUrl('');

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setPreviewUrl(dataUrl);

            const img = new Image();
            img.onload = () => {
                imageElementRef.current = img;
                setImageSize({ width: img.width, height: img.height });
                setCrop(createDefaultCrop(img.width, img.height));
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadFile(file);
        e.target.value = '';
    }, [loadFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) loadFile(file);
    }, [loadFile]);

    const getDisplayMetrics = useCallback(() => {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!img || !container || imageSize.width === 0) return null;

        const rect = img.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scale = rect.width / imageSize.width;

        return {
            scale,
            offsetX: rect.left - containerRect.left,
            offsetY: rect.top - containerRect.top,
            displayWidth: rect.width,
            displayHeight: rect.height,
        };
    }, [imageSize]);

    const displayToImageCoords = useCallback((clientX: number, clientY: number) => {
        const metrics = getDisplayMetrics();
        const container = containerRef.current;
        if (!metrics || !container) return { x: 0, y: 0 };

        const containerRect = container.getBoundingClientRect();
        const relX = clientX - containerRect.left - metrics.offsetX;
        const relY = clientY - containerRect.top - metrics.offsetY;

        return {
            x: relX / metrics.scale,
            y: relY / metrics.scale,
        };
    }, [getDisplayMetrics]);

    const handlePointerDown = useCallback((e: React.PointerEvent, mode: DragMode) => {
        if (!previewUrl) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragMode(mode);
        dragStartRef.current = { x: e.clientX, y: e.clientY, crop: { ...crop } };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [previewUrl, crop]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging || !dragStartRef.current || !dragMode) return;

        const metrics = getDisplayMetrics();
        if (!metrics) return;

        const dx = (e.clientX - dragStartRef.current.x) / metrics.scale;
        const dy = (e.clientY - dragStartRef.current.y) / metrics.scale;
        const startCrop = dragStartRef.current.crop;

        if (dragMode === 'move') {
            setCrop(clampCrop({
                x: startCrop.x + dx,
                y: startCrop.y + dy,
                size: startCrop.size,
            }, imageSize.width, imageSize.height));
        } else if (dragMode === 'resize') {
            const delta = Math.max(dx, dy);
            setCrop(clampCrop({
                x: startCrop.x,
                y: startCrop.y,
                size: startCrop.size + delta,
            }, imageSize.width, imageSize.height));
        }
    }, [isDragging, dragMode, getDisplayMetrics, imageSize]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
        setDragMode(null);
        dragStartRef.current = null;
    }, []);

    const handleGenerate = useCallback(() => {
        const img = imageElementRef.current;
        if (!img || imageSize.width === 0) return;

        setIsGenerating(true);
        setError(null);

        try {
            const url = generateIcoPreviewUrl(img, crop, iconSize, borderRadius);
            setPreviewIcoUrl(url);
        } catch {
            setError('ICO 生成失败');
        } finally {
            setIsGenerating(false);
        }
    }, [crop, iconSize, borderRadius, imageSize.width]);

    const handleDownload = useCallback(async () => {
        const img = imageElementRef.current;
        if (!img || imageSize.width === 0) return;

        setIsGenerating(true);
        setError(null);

        try {
            const blob = await generateIcoBlob(img, crop, iconSize, borderRadius);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'favicon.ico';
            link.click();
            URL.revokeObjectURL(url);

            if (!previewIcoUrl) {
                setPreviewIcoUrl(generateIcoPreviewUrl(img, crop, iconSize, borderRadius));
            }
        } catch {
            setError('ICO 下载失败');
        } finally {
            setIsGenerating(false);
        }
    }, [crop, iconSize, borderRadius, imageSize.width, previewIcoUrl]);

    const handleReset = useCallback(() => {
        setSelectedFile(null);
        setPreviewUrl('');
        setPreviewIcoUrl('');
        setImageSize({ width: 0, height: 0 });
        setCrop({ x: 0, y: 0, size: 0 });
        setIconSize(64);
        setBorderRadius(30);
        setError(null);
        imageElementRef.current = null;
    }, []);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) loadFile(file);
                    break;
                }
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [loadFile]);

    const metrics = getDisplayMetrics();
    const cropStyle = metrics && crop.size > 0 ? {
        left: metrics.offsetX + crop.x * metrics.scale,
        top: metrics.offsetY + crop.y * metrics.scale,
        width: crop.size * metrics.scale,
        height: crop.size * metrics.scale,
    } : null;

    return (
        <div className="flex w-full flex-col items-center px-4 py-10 sm:px-6 lg:px-8 pb-24 md:pb-10">
            <div className="flex w-full max-w-6xl flex-col items-center gap-2 text-center mb-8">
                <p className="text-3xl font-black leading-tight tracking-tighter text-gray-900 dark:text-white sm:text-4xl">
                    ICO 图标生成器
                </p>
                <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                    将 PNG / JPG 等图片一键转换为 favicon.ico，支持多尺寸与圆角效果
                </p>
            </div>

            <div className="w-full max-w-6xl flex flex-col gap-6">
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-100 p-4 dark:border-red-800 dark:bg-red-900/50">
                        <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* 左侧：上传与裁剪 */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-background-dark">
                        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                            <span className="material-symbols-outlined text-xl">upload_file</span>
                            上传图片并选择规格
                        </h3>

                        {!previewUrl ? (
                            <label
                                onDrop={handleDrop}
                                onDragOver={e => e.preventDefault()}
                                className="flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed border-gray-300 p-10 text-center transition-colors hover:border-primary dark:border-gray-700 dark:hover:border-primary"
                            >
                                <span className="material-symbols-outlined text-5xl text-gray-400">web_asset</span>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">单击或拖拽图片到此处上传</p>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        支持 PNG / JPG / JPEG / GIF / WebP，建议为正方形图标
                                    </p>
                                </div>
                                <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 dark:bg-white/10 dark:text-white">
                                    选择文件
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </label>
                        ) : (
                            <div className="space-y-4">
                                <div
                                    ref={containerRef}
                                    className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                >
                                    <img
                                        ref={imageRef}
                                        src={previewUrl}
                                        alt="上传预览"
                                        className="max-h-[360px] max-w-full select-none object-contain"
                                        draggable={false}
                                    />
                                    {cropStyle && (
                                        <div
                                            className="absolute border-2 border-primary bg-primary/10"
                                            style={cropStyle}
                                            onPointerDown={e => handlePointerDown(e, 'move')}
                                        >
                                            <div
                                                className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize rounded-sm border-2 border-white bg-primary shadow"
                                                onPointerDown={e => handlePointerDown(e, 'resize')}
                                            />
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    拖动蓝色框或右下角小点，可以自由选择生成图标的区域（保持正方形）
                                </p>
                                {selectedFile && (
                                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                        {selectedFile.name}（{imageSize.width} × {imageSize.height}）
                                    </p>
                                )}

                                <div>
                                    <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">图标尺寸</p>
                                    <div className="flex flex-wrap gap-2">
                                        {ICO_SIZES.map(size => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => setIconSize(size)}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                                    iconSize === size
                                                        ? 'bg-primary text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {size}×{size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">圆角率</p>
                                        <span className="text-sm font-medium text-primary">{borderRadius}%</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {ICO_RADIUS_PRESETS.map(radius => (
                                            <button
                                                key={radius}
                                                type="button"
                                                onClick={() => setBorderRadius(radius)}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                                    borderRadius === radius
                                                        ? 'bg-primary text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {radius}%
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-lg">auto_fix_high</span>
                                        生成 ICO 图标
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="flex h-10 items-center justify-center gap-1 rounded-lg border border-gray-200 px-4 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                        重置
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 右侧：预览与下载 */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-background-dark">
                        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                            <span className="material-symbols-outlined text-xl">preview</span>
                            .ico 预览与下载
                        </h3>
                        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                            预览为 PNG 渲染效果，下载为标准 favicon.ico 文件
                        </p>

                        <div
                            className="mb-4 flex min-h-[240px] items-center justify-center rounded-lg border border-gray-200 p-8 dark:border-gray-700"
                            style={{
                                backgroundImage: 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)',
                                backgroundSize: '16px 16px',
                                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                backgroundColor: '#f5f5f5',
                            }}
                        >
                            {previewIcoUrl ? (
                                <img
                                    src={previewIcoUrl}
                                    alt="ICO 预览"
                                    className="max-h-[200px] max-w-full object-contain"
                                    style={{ width: Math.min(iconSize * 2, 200), height: Math.min(iconSize * 2, 200) }}
                                />
                            ) : (
                                <p className="text-sm text-gray-400">生成后将在此显示预览</p>
                            )}
                        </div>

                        <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
                            <p className="text-gray-700 dark:text-gray-300">
                                文件名：<strong>favicon.ico</strong>
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">尺寸：{iconSize}×{iconSize}</p>
                            <p className="text-gray-700 dark:text-gray-300">圆角率：{borderRadius}%</p>
                        </div>

                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={!previewUrl || isGenerating}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                                    处理中...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">download</span>
                                    下载 favicon.ico
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 使用说明 */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-background-dark">
                    <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">使用说明</h3>
                    <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                        <li><strong className="text-gray-900 dark:text-white">上传图片：</strong>点击选择文件，或将图片拖拽到上传区域，支持 PNG、JPG、JPEG、GIF、WebP 等常见格式。</li>
                        <li><strong className="text-gray-900 dark:text-white">选择尺寸与圆角：</strong>根据实际需求选择 ICO 图标尺寸（如 16×16、32×32、64×64 等）以及圆角率。</li>
                        <li><strong className="text-gray-900 dark:text-white">生成与预览：</strong>点击「生成 ICO 图标」，系统会在浏览器本地完成裁剪与圆角处理，并生成预览。</li>
                        <li><strong className="text-gray-900 dark:text-white">下载 favicon.ico：</strong>点击下载按钮保存到本地，建议放置于网站根目录并通过 <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">&lt;link rel=&quot;icon&quot; href=&quot;/favicon.ico&quot;&gt;</code> 引用。</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default IcoGeneratorTool;
