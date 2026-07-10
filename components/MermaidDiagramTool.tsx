import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    DEFAULT_MERMAID_CODE,
    MERMAID_EXAMPLES,
    exportMermaidPng,
    exportMermaidSvg,
    loadSavedMermaidCode,
    renderMermaid,
    saveMermaidCode,
} from '../utils/mermaidRenderer';

type MobilePane = 'edit' | 'preview';

const MermaidDiagramTool: React.FC = () => {
    const [code, setCode] = useState<string>('');
    const [svgOutput, setSvgOutput] = useState<string>('');
    const [renderError, setRenderError] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [mobilePane, setMobilePane] = useState<MobilePane>('edit');
    const [hint, setHint] = useState('');
    const [isHintFadingOut, setIsHintFadingOut] = useState(false);

    const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const lineCount = code.split('\n').length;
    const charCount = code.length;

    const showHint = useCallback((message: string) => {
        setHint(message);
        setIsHintFadingOut(false);
        setTimeout(() => setIsHintFadingOut(true), 1700);
        setTimeout(() => {
            setHint('');
            setIsHintFadingOut(false);
        }, 2000);
    }, []);

    useEffect(() => {
        setCode(loadSavedMermaidCode());
    }, []);

    useEffect(() => {
        if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);

        if (!code.trim()) {
            setSvgOutput('');
            setRenderError(null);
            return;
        }

        renderTimeoutRef.current = setTimeout(async () => {
            setIsRendering(true);
            try {
                const svg = await renderMermaid(code);
                setSvgOutput(svg);
                setRenderError(null);
            } catch (error) {
                setSvgOutput('');
                const message = error instanceof Error ? error.message : 'Mermaid 语法错误，请检查代码';
                setRenderError(message);
            } finally {
                setIsRendering(false);
            }
        }, 400);

        return () => {
            if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
        };
    }, [code]);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            saveMermaidCode(code);
        }, 500);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [code]);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            if (!code.trim()) return;
            renderMermaid(code)
                .then(svg => {
                    setSvgOutput(svg);
                    setRenderError(null);
                })
                .catch(error => {
                    const message = error instanceof Error ? error.message : 'Mermaid 渲染失败';
                    setRenderError(message);
                });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, [code]);

    const handleLoadExample = useCallback((key: keyof typeof MERMAID_EXAMPLES) => {
        setCode(MERMAID_EXAMPLES[key].code);
        showHint(`已加载${MERMAID_EXAMPLES[key].label}示例`);
    }, [showHint]);

    const handleClear = useCallback(() => {
        if (!code.trim()) return;
        if (window.confirm('确定清空当前 Mermaid 代码吗？')) {
            setCode('');
            saveMermaidCode('');
        }
    }, [code]);

    const handleExportSvg = useCallback(() => {
        if (!svgOutput) {
            showHint('请先确保图表渲染成功');
            return;
        }
        exportMermaidSvg(svgOutput);
        showHint('已导出 SVG 文件');
    }, [svgOutput, showHint]);

    const handleExportPng = useCallback(async () => {
        if (!svgOutput) {
            showHint('请先确保图表渲染成功');
            return;
        }

        setIsExporting(true);
        try {
            await exportMermaidPng(svgOutput);
            showHint('已导出 PNG 文件');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'PNG 导出失败';
            showHint(message);
        } finally {
            setIsExporting(false);
        }
    }, [svgOutput, showHint]);

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

            <div className="flex w-full max-w-7xl flex-col items-center gap-2 text-center mb-6">
                <p className="text-3xl font-black leading-tight tracking-tighter text-gray-900 dark:text-white sm:text-4xl">
                    Mermaid 图表
                </p>
                <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                    输入 Mermaid 语法实时渲染流程图、时序图、甘特图等，支持导出 SVG / PNG。
                </p>
            </div>

            <div className="w-full max-w-7xl">
                <div className="mb-3 flex flex-col gap-3 rounded-xl border border-border-light bg-surface-light p-3 shadow-sm dark:border-border-dark dark:bg-surface-dark sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <select
                                defaultValue=""
                                onChange={e => {
                                    const value = e.target.value as keyof typeof MERMAID_EXAMPLES;
                                    if (value) handleLoadExample(value);
                                    e.target.value = '';
                                }}
                                className="appearance-none rounded-lg border border-border-light bg-white py-2 pl-3 pr-8 text-sm text-gray-700 outline-none dark:border-border-dark dark:bg-gray-800 dark:text-gray-200"
                            >
                                <option value="" disabled>加载示例</option>
                                {Object.entries(MERMAID_EXAMPLES).map(([key, item]) => (
                                    <option key={key} value={key}>{item.label}</option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-base text-gray-400">
                                expand_more
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex items-center gap-1 rounded-lg border border-border-light px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-border-dark dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <span className="material-symbols-outlined text-lg">delete</span>
                            清空
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportSvg}
                            disabled={!svgOutput || isExporting}
                            className="flex items-center gap-1 rounded-lg border border-border-light px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-dark dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            导出 SVG
                        </button>
                        <button
                            type="button"
                            onClick={handleExportPng}
                            disabled={!svgOutput || isExporting}
                            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-lg">image</span>
                            {isExporting ? '导出中...' : '导出 PNG'}
                        </button>
                    </div>
                </div>

                <div className="mb-3 flex rounded-lg border border-border-light bg-gray-100 p-1 dark:border-border-dark dark:bg-gray-800 md:hidden">
                    {(['edit', 'preview'] as MobilePane[]).map(pane => (
                        <button
                            key={pane}
                            type="button"
                            onClick={() => setMobilePane(pane)}
                            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                                mobilePane === pane
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400'
                            }`}
                        >
                            {pane === 'edit' ? '编辑' : '预览'}
                        </button>
                    ))}
                </div>

                <div className="grid h-[calc(100vh-18rem)] min-h-[480px] grid-cols-1 gap-4 md:grid-cols-2">
                    <div className={`flex flex-col overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark ${mobilePane !== 'edit' ? 'hidden md:flex' : 'flex'}`}>
                        <div className="flex items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">编辑</span>
                            <span className="text-xs text-gray-400">{lineCount} 行 · {charCount} 字符</span>
                        </div>
                        <textarea
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            spellCheck={false}
                            className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 outline-none dark:text-gray-100"
                            placeholder="在此输入 Mermaid 语法，例如 flowchart TD ..."
                        />
                    </div>

                    <div className={`flex flex-col overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark ${mobilePane !== 'preview' ? 'hidden md:flex' : 'flex'}`}>
                        <div className="flex items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">预览</span>
                            {isRendering && (
                                <span className="text-xs text-gray-400">渲染中...</span>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {renderError ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                                    <p className="mb-1 font-medium">语法错误</p>
                                    <p className="whitespace-pre-wrap break-words">{renderError}</p>
                                </div>
                            ) : svgOutput ? (
                                <div
                                    ref={previewRef}
                                    className="mermaid-preview flex min-h-full items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto"
                                    dangerouslySetInnerHTML={{ __html: svgOutput }}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                    在左侧输入 Mermaid 代码，图表将在这里实时渲染
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MermaidDiagramTool;
