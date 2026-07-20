import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AngleMode,
    CalcHistoryItem,
    evaluateExpression,
    tryLivePreview,
} from '../utils/scientificCalc';

const EXPR_KEY = 'freetool-sci-calc-expr';
const ANS_KEY = 'freetool-sci-calc-ans';
const MEM_KEY = 'freetool-sci-calc-mem';
const MODE_KEY = 'freetool-sci-calc-mode';
const HISTORY_KEY = 'freetool-sci-calc-history';

type ButtonKind = 'num' | 'op' | 'fn' | 'action' | 'eq';

interface CalcButton {
    label: string;
    display?: string;
    kind: ButtonKind;
    span?: number;
    action: string;
}

const MAIN_KEYS: CalcButton[][] = [
    [
        { label: '7', kind: 'num', action: 'digit:7' },
        { label: '8', kind: 'num', action: 'digit:8' },
        { label: '9', kind: 'num', action: 'digit:9' },
        { label: '+', kind: 'op', action: 'insert:+' },
    ],
    [
        { label: '4', kind: 'num', action: 'digit:4' },
        { label: '5', kind: 'num', action: 'digit:5' },
        { label: '6', kind: 'num', action: 'digit:6' },
        { label: '−', kind: 'op', action: 'insert:-' },
    ],
    [
        { label: '1', kind: 'num', action: 'digit:1' },
        { label: '2', kind: 'num', action: 'digit:2' },
        { label: '3', kind: 'num', action: 'digit:3' },
        { label: '×', kind: 'op', action: 'insert:*' },
    ],
    [
        { label: 'Ans', kind: 'fn', action: 'insert:Ans' },
        { label: '0', kind: 'num', action: 'digit:0' },
        { label: '.', kind: 'num', action: 'digit:.' },
        { label: '÷', kind: 'op', action: 'insert:/' },
    ],
    [
        { label: '±', kind: 'fn', action: 'negate' },
        { label: 'EXP', kind: 'fn', action: 'insert:e' },
        { label: 'RND', kind: 'fn', action: 'rnd' },
        { label: 'AC', kind: 'action', action: 'ac' },
    ],
    [
        { label: 'M+', kind: 'fn', action: 'mplus' },
        { label: 'M−', kind: 'fn', action: 'mminus' },
        { label: 'MR', kind: 'fn', action: 'mr' },
        { label: '=', kind: 'eq', action: 'equals' },
    ],
];

const SCI_KEYS: CalcButton[][] = [
    [
        { label: 'sin', kind: 'fn', action: 'fn:sin' },
        { label: 'cos', kind: 'fn', action: 'fn:cos' },
        { label: 'tan', kind: 'fn', action: 'fn:tan' },
        { label: 'sin⁻¹', kind: 'fn', action: 'fn:asin' },
        { label: 'cos⁻¹', kind: 'fn', action: 'fn:acos' },
        { label: 'tan⁻¹', kind: 'fn', action: 'fn:atan' },
    ],
    [
        { label: 'π', kind: 'fn', action: 'insert:π' },
        { label: 'e', kind: 'fn', action: 'insert:e' },
        { label: 'xʸ', kind: 'fn', action: 'insert:^' },
        { label: 'x³', kind: 'fn', action: 'pow:3' },
        { label: 'x²', kind: 'fn', action: 'pow:2' },
        { label: 'eˣ', kind: 'fn', action: 'fn:exp' },
    ],
    [
        { label: '10ˣ', kind: 'fn', action: 'tenpow' },
        { label: 'ʸ√x', kind: 'fn', action: 'root' },
        { label: '³√x', kind: 'fn', action: 'fn:cbrt' },
        { label: '√x', kind: 'fn', action: 'fn:sqrt' },
        { label: 'ln', kind: 'fn', action: 'fn:ln' },
        { label: 'log', kind: 'fn', action: 'fn:log' },
    ],
    [
        { label: '(', kind: 'fn', action: 'insert:(' },
        { label: ')', kind: 'fn', action: 'insert:)' },
        { label: '1/x', kind: 'fn', action: 'reciprocal' },
        { label: '%', kind: 'fn', action: 'insert:%' },
        { label: 'n!', kind: 'fn', action: 'insert:!' },
        { label: '⌫', kind: 'action', action: 'backspace' },
    ],
];

const buttonClass = (kind: ButtonKind): string => {
    const base =
        'h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.96] select-none touch-manipulation';
    switch (kind) {
        case 'num':
            return `${base} bg-white text-gray-900 shadow-sm border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700`;
        case 'op':
            return `${base} bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900 dark:hover:bg-indigo-900/60`;
        case 'fn':
            return `${base} bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700`;
        case 'action':
            return `${base} bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 dark:hover:bg-rose-900/50`;
        case 'eq':
            return `${base} bg-primary text-white shadow-md shadow-primary/25 hover:opacity-90`;
        default:
            return base;
    }
};

const ScientificCalculatorTool: React.FC = () => {
    const [expression, setExpression] = useState('');
    const [ans, setAns] = useState(0);
    const [memory, setMemory] = useState(0);
    const [mode, setMode] = useState<AngleMode>('deg');
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<CalcHistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [justEvaluated, setJustEvaluated] = useState(false);

    useEffect(() => {
        setExpression(localStorage.getItem(EXPR_KEY) ?? '');
        setAns(Number(localStorage.getItem(ANS_KEY) ?? '0') || 0);
        setMemory(Number(localStorage.getItem(MEM_KEY) ?? '0') || 0);
        const savedMode = localStorage.getItem(MODE_KEY);
        if (savedMode === 'deg' || savedMode === 'rad') setMode(savedMode);
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (raw) setHistory(JSON.parse(raw) as CalcHistoryItem[]);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(EXPR_KEY, expression);
    }, [expression]);

    useEffect(() => {
        localStorage.setItem(ANS_KEY, String(ans));
    }, [ans]);

    useEffect(() => {
        localStorage.setItem(MEM_KEY, String(memory));
    }, [memory]);

    useEffect(() => {
        localStorage.setItem(MODE_KEY, mode);
    }, [mode]);

    useEffect(() => {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    }, [history]);

    const preview = useMemo(
        () => tryLivePreview(expression, mode, ans),
        [expression, mode, ans],
    );

    const currentValue = useCallback((): number | null => {
        if (!expression.trim()) return ans;
        const result = evaluateExpression(expression, mode, ans);
        return result.ok ? result.value : null;
    }, [expression, mode, ans]);

    const append = useCallback((text: string, forceNew = false) => {
        setError(null);
        setExpression(prev => {
            if (forceNew || (justEvaluated && /^[0-9.πe]/.test(text) && text !== 'e')) {
                setJustEvaluated(false);
                return text;
            }
            setJustEvaluated(false);
            return prev + text;
        });
    }, [justEvaluated]);

    const wrapFunc = useCallback((name: string) => {
        setError(null);
        setJustEvaluated(false);
        setExpression(prev => {
            if (justEvaluated && prev) return `${name}(${prev})`;
            return `${prev}${name}(`;
        });
    }, [justEvaluated]);

    const evaluate = useCallback(() => {
        if (!expression.trim()) return;
        const result = evaluateExpression(expression, mode, ans);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setAns(result.value);
        setExpression(result.display);
        setJustEvaluated(true);
        setError(null);
        setHistory(prev => [
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                expression,
                result: result.display,
                timestamp: Date.now(),
            },
            ...prev,
        ].slice(0, 50));
    }, [expression, mode, ans]);

    const handleAction = useCallback((action: string) => {
        if (action.startsWith('digit:')) {
            append(action.slice(6));
            return;
        }
        if (action.startsWith('insert:')) {
            const raw = action.slice(7);
            const mapped = raw === '*' ? '×' : raw === '/' ? '÷' : raw === '-' ? '−' : raw;
            append(mapped);
            return;
        }
        if (action.startsWith('fn:')) {
            wrapFunc(action.slice(3));
            return;
        }
        if (action.startsWith('pow:')) {
            append(`^${action.slice(4)}`);
            return;
        }

        switch (action) {
            case 'ac':
                setExpression('');
                setError(null);
                setJustEvaluated(false);
                break;
            case 'backspace':
                setJustEvaluated(false);
                setError(null);
                setExpression(prev => prev.slice(0, -1));
                break;
            case 'equals':
                evaluate();
                break;
            case 'negate': {
                setJustEvaluated(false);
                setError(null);
                setExpression(prev => {
                    if (!prev) return '-';
                    if (prev.startsWith('-(') && prev.endsWith(')')) return prev.slice(2, -1);
                    return `-(${prev})`;
                });
                break;
            }
            case 'rnd':
                append(String(Math.random()), justEvaluated);
                break;
            case 'mplus': {
                const v = currentValue();
                if (v === null) {
                    setError('无法写入记忆');
                    return;
                }
                setMemory(m => m + v);
                break;
            }
            case 'mminus': {
                const v = currentValue();
                if (v === null) {
                    setError('无法写入记忆');
                    return;
                }
                setMemory(m => m - v);
                break;
            }
            case 'mr':
                append(String(memory), justEvaluated || !expression);
                break;
            case 'tenpow':
                setError(null);
                setJustEvaluated(false);
                setExpression(prev => `${prev}10^`);
                break;
            case 'root':
                setError(null);
                setJustEvaluated(false);
                setExpression(prev => `${prev}root(`);
                break;
            case 'reciprocal':
                setError(null);
                setJustEvaluated(false);
                setExpression(prev => (prev ? `1/(${prev})` : '1/('));
                break;
            default:
                break;
        }
    }, [append, wrapFunc, evaluate, currentValue, memory, justEvaluated, expression]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (showHistory) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                handleAction('equals');
                return;
            }
            if (e.key === 'Backspace') {
                e.preventDefault();
                handleAction('backspace');
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                handleAction('ac');
                return;
            }
            if (e.key === '*') {
                e.preventDefault();
                append('×');
                return;
            }
            if (e.key === '/') {
                e.preventDefault();
                append('÷');
                return;
            }
            if (e.key === '^') {
                e.preventDefault();
                append('^');
                return;
            }
            if (e.key === '+') {
                e.preventDefault();
                append('+');
                return;
            }
            if (e.key === '-') {
                e.preventDefault();
                append('−');
                return;
            }
            if (/^[0-9.]$/.test(e.key)) {
                e.preventDefault();
                append(e.key);
                return;
            }
            if (e.key === '(' || e.key === ')' || e.key === '%' || e.key === '!') {
                e.preventDefault();
                append(e.key);
                return;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleAction, append, showHistory]);

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem(HISTORY_KEY);
    };

    const loadHistoryItem = (item: CalcHistoryItem) => {
        setExpression(item.result);
        setAns(Number(item.result) || 0);
        setJustEvaluated(true);
        setError(null);
        setShowHistory(false);
    };

    return (
        <div className="flex w-full flex-col items-center px-4 py-10 sm:px-6 lg:px-8 pb-24 md:pb-10">
            <div className="mb-8 flex w-full max-w-4xl flex-col items-center gap-2 text-center">
                <p className="text-3xl font-black leading-tight tracking-tighter text-gray-900 dark:text-white sm:text-4xl">
                    高级科学计算器
                </p>
                <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                    支持角度/弧度切换、三角函数、指数对数、寄存器记忆与历史记录，纯浏览器本地计算
                </p>
            </div>

            <div className="w-full max-w-4xl">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-background-dark">
                    {/* Display */}
                    <div className="border-b border-gray-200 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-5 dark:border-gray-800 dark:from-gray-900 dark:to-indigo-950/30">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="inline-flex rounded-lg bg-white/80 p-1 shadow-sm dark:bg-gray-800/80">
                                    {(['deg', 'rad'] as AngleMode[]).map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setMode(m)}
                                            className={`rounded-md px-3 py-1 text-xs font-bold uppercase transition-colors ${
                                                mode === m
                                                    ? 'bg-primary text-white'
                                                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                                            }`}
                                        >
                                            {m === 'deg' ? 'Deg' : 'Rad'}
                                        </button>
                                    ))}
                                </div>
                                {memory !== 0 && (
                                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                        M: {memory}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHistory(true)}
                                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                <span className="material-symbols-outlined text-base">history</span>
                                历史记录
                            </button>
                        </div>

                        <div className="min-h-[4.5rem] text-right">
                            <p className="break-all font-mono text-lg text-gray-500 dark:text-gray-400 sm:text-xl">
                                {expression || '0'}
                            </p>
                            <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                                {error ? (
                                    <span className="text-base font-medium text-rose-500">{error}</span>
                                ) : (
                                    preview ?? (justEvaluated ? expression : '')
                                )}
                            </p>
                        </div>
                        <p className="mt-2 text-right text-xs text-gray-400">Ans = {ans}</p>
                    </div>

                    {/* Keypads */}
                    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.15fr_1fr]">
                        <div className="space-y-2">
                            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                主键盘
                            </p>
                            {MAIN_KEYS.map((row, i) => (
                                <div key={i} className="grid grid-cols-4 gap-2">
                                    {row.map(btn => (
                                        <button
                                            key={btn.label + btn.action}
                                            type="button"
                                            onClick={() => handleAction(btn.action)}
                                            className={buttonClass(btn.kind)}
                                        >
                                            {btn.display ?? btn.label}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                科学函数
                            </p>
                            {SCI_KEYS.map((row, i) => (
                                <div key={i} className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
                                    {row.map(btn => (
                                        <button
                                            key={btn.label + btn.action}
                                            type="button"
                                            onClick={() => handleAction(btn.action)}
                                            className={buttonClass(btn.kind)}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Shortcuts */}
                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-background-dark">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">键盘快捷键</h3>
                    <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
                        <p><kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800">*</kbd> / <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800">/</kbd> 乘法、除法</p>
                        <p><kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800">^</kbd> 指数</p>
                        <p><kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800">Enter</kbd> 计算结果并保存历史</p>
                        <p><kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800">Backspace</kbd> 删除字符 · <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800">Esc</kbd> 清空</p>
                    </div>
                </div>
            </div>

            {/* History modal */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setShowHistory(false)}>
                    <div
                        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                            <h3 className="font-semibold text-gray-900 dark:text-white">历史记录</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={clearHistory}
                                    className="text-xs text-rose-500 hover:text-rose-600"
                                >
                                    清空记录
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowHistory(false)}
                                    className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {history.length === 0 ? (
                                <p className="py-10 text-center text-sm text-gray-400">暂无历史记录</p>
                            ) : (
                                history.map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => loadHistoryItem(item)}
                                        className="mb-1 flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{item.expression}</span>
                                        <span className="font-mono text-base font-semibold text-gray-900 dark:text-white">= {item.result}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScientificCalculatorTool;
