import React, { useState, useCallback, useMemo } from 'react';
import {
    CGCS2000_BANDS,
    ConvertResult,
    CoordSystem,
    convertAll,
    formatLngLat,
    formatProjected,
    inferBand3,
    parseCoordPair,
} from '../utils/coordinateTransform';

type Mode = 'single' | 'batch';

interface BatchRow {
    input: string;
    result: ConvertResult | null;
    error?: string;
}

const SYSTEM_OPTIONS: { id: CoordSystem; label: string; hint: string }[] = [
    { id: 'WGS84', label: 'WGS84', hint: '国际通用 / Google 海外' },
    { id: 'GCJ02', label: 'GCJ02', hint: '高德、腾讯、Google 国内' },
    { id: 'BD09', label: 'BD09', hint: '百度地图' },
    { id: 'CGCS2000', label: 'CGCS2000', hint: '国家 2000 大地坐标（3 度带投影）' },
];

const CoordinateConverterTool: React.FC = () => {
    const [mode, setMode] = useState<Mode>('single');
    const [sourceSystem, setSourceSystem] = useState<CoordSystem>('WGS84');
    const [coordText, setCoordText] = useState('116.397428,39.90923');
    const [band, setBand] = useState(39);
    const [batchText, setBatchText] = useState('116.397428,39.90923\n121.473701,31.230416');
    const [singleResult, setSingleResult] = useState<ConvertResult | null>(null);
    const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [hint, setHint] = useState('');
    const [isHintFadingOut, setIsHintFadingOut] = useState(false);

    const isCgcs = sourceSystem === 'CGCS2000';

    const showHint = useCallback((message: string) => {
        setHint(message);
        setIsHintFadingOut(false);
        setTimeout(() => setIsHintFadingOut(true), 1700);
        setTimeout(() => {
            setHint('');
            setIsHintFadingOut(false);
        }, 2000);
    }, []);

    const runSingle = useCallback(() => {
        setError(null);
        const parsed = parseCoordPair(coordText);
        if (!parsed) {
            setSingleResult(null);
            setError('请输入有效坐标，格式如：经度,纬度 或 东向,北向');
            return;
        }
        try {
            const result = convertAll(sourceSystem, parsed.x, parsed.y, isCgcs ? band : undefined);
            setSingleResult(result);
            if (!isCgcs) setBand(inferBand3(result.WGS84.lng));
        } catch (e) {
            setSingleResult(null);
            setError(e instanceof Error ? e.message : '转换失败');
        }
    }, [coordText, sourceSystem, band, isCgcs]);

    const runBatch = useCallback(() => {
        setError(null);
        const lines = batchText
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);

        if (lines.length === 0) {
            setBatchRows([]);
            setError('请输入至少一行坐标');
            return;
        }

        const rows: BatchRow[] = lines.map(line => {
            const parsed = parseCoordPair(line);
            if (!parsed) {
                return { input: line, result: null, error: '格式无效' };
            }
            try {
                return {
                    input: line,
                    result: convertAll(sourceSystem, parsed.x, parsed.y, isCgcs ? band : undefined),
                };
            } catch (e) {
                return {
                    input: line,
                    result: null,
                    error: e instanceof Error ? e.message : '转换失败',
                };
            }
        });
        setBatchRows(rows);
    }, [batchText, sourceSystem, band, isCgcs]);

    const copyText = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showHint('已复制到剪贴板');
        } catch {
            showHint('复制失败');
        }
    }, [showHint]);

    const exportCsv = useCallback(() => {
        const rows = mode === 'single'
            ? (singleResult ? [{ input: coordText, result: singleResult }] : [])
            : batchRows.filter(r => r.result);

        if (rows.length === 0) {
            showHint('暂无结果可导出');
            return;
        }

        const header = '输入,WGS84(lng,lat),GCJ02(lng,lat),BD09(lng,lat),CGCS2000(east,north,band)';
        const body = rows
            .map(r => {
                const res = r.result!;
                return [
                    `"${r.input || coordText}"`,
                    formatLngLat(res.WGS84),
                    formatLngLat(res.GCJ02),
                    formatLngLat(res.BD09),
                    formatProjected(res.CGCS2000),
                ].join(',');
            })
            .join('\n');

        const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mafreetool_coordinate.csv';
        a.click();
        URL.revokeObjectURL(url);
        showHint('已导出 CSV');
    }, [mode, singleResult, batchRows, coordText, showHint]);

    const resultCards = useMemo(() => {
        if (!singleResult) return null;
        return [
            { label: 'WGS84 (lng, lat)', value: formatLngLat(singleResult.WGS84) },
            { label: 'GCJ02 (lng, lat)', value: formatLngLat(singleResult.GCJ02) },
            { label: 'BD09 (lng, lat)', value: formatLngLat(singleResult.BD09) },
            {
                label: 'CGCS2000 (east, north, band)',
                value: formatProjected(singleResult.CGCS2000),
            },
        ];
    }, [singleResult]);

    return (
        <div className="flex w-full flex-col items-center px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-10">
            {hint && (
                <div
                    className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-700 ${
                        isHintFadingOut ? 'animate-fade-out-up' : 'animate-fade-in-down'
                    }`}
                >
                    {hint}
                </div>
            )}

            <div className="mb-6 flex w-full max-w-5xl flex-col items-center gap-2 text-center">
                <p className="text-3xl font-black leading-tight tracking-tighter text-gray-900 dark:text-white sm:text-4xl">
                    坐标转换
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400">
                    WGS84 / GCJ02 / BD09 / CGCS2000 坐标系互转，支持单个与批量转换。
                </p>
            </div>

            <div className="w-full max-w-5xl space-y-4">
                <div className="flex rounded-lg border border-border-light bg-gray-100 p-1 dark:border-border-dark dark:bg-gray-800">
                    {([
                        { id: 'single' as Mode, label: '单个转换' },
                        { id: 'batch' as Mode, label: '批量转换' },
                    ]).map(item => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setMode(item.id)}
                            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                                mode === item.id
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="rounded-xl border border-border-light bg-surface-light p-4 shadow-sm dark:border-border-dark dark:bg-surface-dark sm:p-6">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        原坐标系
                    </label>
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {SYSTEM_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setSourceSystem(opt.id)}
                                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                                    sourceSystem === opt.id
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border-light hover:bg-gray-50 dark:border-border-dark dark:hover:bg-gray-700'
                                }`}
                            >
                                <div className="text-sm font-semibold">{opt.label}</div>
                                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{opt.hint}</div>
                            </button>
                        ))}
                    </div>

                    {isCgcs && (
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                3 度分带号
                            </label>
                            <select
                                value={band}
                                onChange={e => setBand(Number(e.target.value))}
                                className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none dark:border-border-dark dark:bg-gray-800 dark:text-gray-100 sm:w-72"
                            >
                                {CGCS2000_BANDS.map(b => (
                                    <option key={b.band} value={b.band}>
                                        {b.band} 带（{b.centralMeridian}°E）
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {mode === 'single' ? (
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                原坐标 {isCgcs ? '(东向,北向)' : '(经度,纬度)'}
                            </label>
                            <input
                                value={coordText}
                                onChange={e => setCoordText(e.target.value)}
                                placeholder={isCgcs ? '例如：39500000.123,4420000.456' : '例如：116.397428,39.90923'}
                                className="w-full rounded-lg border border-border-light bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-primary dark:border-border-dark dark:bg-gray-800 dark:text-gray-100"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                经度东经为正、西经为负；纬度北纬为正、南纬为负。可用逗号或空格分隔。
                            </p>
                        </div>
                    ) : (
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                批量坐标（每行一组）
                            </label>
                            <textarea
                                value={batchText}
                                onChange={e => setBatchText(e.target.value)}
                                rows={8}
                                spellCheck={false}
                                placeholder={'116.397428,39.90923\n121.473701,31.230416'}
                                className="w-full resize-y rounded-lg border border-border-light bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-primary dark:border-border-dark dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={mode === 'single' ? runSingle : runBatch}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                        >
                            {mode === 'single' ? '转换坐标系' : '批量转换坐标系'}
                        </button>
                        <button
                            type="button"
                            onClick={exportCsv}
                            className="rounded-lg border border-border-light px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-border-dark dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            导出 CSV
                        </button>
                    </div>
                </div>

                {mode === 'single' && resultCards && (
                    <div className="rounded-xl border border-border-light bg-surface-light p-4 shadow-sm dark:border-border-dark dark:bg-surface-dark sm:p-6">
                        <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">转换结果</h3>
                        <div className="space-y-2">
                            {resultCards.map(card => (
                                <div
                                    key={card.label}
                                    className="flex flex-col gap-2 rounded-lg border border-border-light px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-border-dark"
                                >
                                    <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
                                        <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{card.value}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => copyText(card.value)}
                                        className="shrink-0 rounded-md border border-border-light px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-border-dark dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        复制
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {mode === 'batch' && batchRows.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-xs sm:text-sm">
                                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">输入</th>
                                        <th className="px-3 py-2 font-medium">WGS84</th>
                                        <th className="px-3 py-2 font-medium">GCJ02</th>
                                        <th className="px-3 py-2 font-medium">BD09</th>
                                        <th className="px-3 py-2 font-medium">CGCS2000</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batchRows.map((row, idx) => (
                                        <tr
                                            key={`${row.input}-${idx}`}
                                            className="border-t border-border-light dark:border-border-dark"
                                        >
                                            <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">{row.input}</td>
                                            {row.result ? (
                                                <>
                                                    <td className="px-3 py-2 font-mono">{formatLngLat(row.result.WGS84, 6)}</td>
                                                    <td className="px-3 py-2 font-mono">{formatLngLat(row.result.GCJ02, 6)}</td>
                                                    <td className="px-3 py-2 font-mono">{formatLngLat(row.result.BD09, 6)}</td>
                                                    <td className="px-3 py-2 font-mono">{formatProjected(row.result.CGCS2000, 2)}</td>
                                                </>
                                            ) : (
                                                <td className="px-3 py-2 text-red-500" colSpan={4}>{row.error}</td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-border-light bg-surface-light p-4 text-sm text-gray-600 dark:border-border-dark dark:bg-surface-dark dark:text-gray-300 sm:p-6">
                    <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">说明</h3>
                    <ul className="list-disc space-y-1 pl-5">
                        <li><strong>WGS84</strong>：地球坐标系，国际通用；Google 海外地图使用。</li>
                        <li><strong>GCJ02</strong>：火星坐标系（WGS84 加密）；高德、腾讯、Google 国内地图使用。</li>
                        <li><strong>BD09</strong>：百度坐标系（GCJ02 再加密）。</li>
                        <li><strong>CGCS2000</strong>：国家 2000 大地坐标系，本工具按 3 度分带高斯-克吕格投影输出 east / north / band。</li>
                    </ul>
                    <p className="mt-3 text-xs text-gray-400">
                        3 度分带带号 = 中央经线 ÷ 3（中国常用 25–45 带）。转换在浏览器本地完成，数据不上传。
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CoordinateConverterTool;
