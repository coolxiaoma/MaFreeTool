import React, { useState, useCallback, useEffect, useRef } from 'react';
import { convertHtmlToMarkdown } from '../utils/htmlToMarkdown';

const STORAGE_KEY = 'freetool-html-to-markdown';
const DEFAULT_FILENAME = 'converted.md';

type MobilePane = 'html' | 'markdown';

const DEFAULT_HTML = `<article>
  <h1>HTML 转 Markdown 示例</h1>
  <p>在左侧粘贴 HTML，右侧会自动转换为 GFM Markdown。</p>
  <h2>支持的内容</h2>
  <ul>
    <li>标题、段落、列表、表格</li>
    <li>链接、图片、引用块</li>
    <li>带语言标记的代码块</li>
  </ul>
  <blockquote>微信公众号 HTML 也做了专项优化。</blockquote>
  <pre><code class="language-javascript">console.log('Hello, Markdown!');</code></pre>
</article>`;

const HtmlToMarkdownTool: React.FC = () => {
    const [htmlInput, setHtmlInput] = useState('');
    const [markdownOutput, setMarkdownOutput] = useState('');
    const [mobilePane, setMobilePane] = useState<MobilePane>('html');
    const [hint, setHint] = useState('');
    const [isHintFadingOut, setIsHintFadingOut] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const convertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const htmlLineCount = htmlInput.split('\n').length;
    const mdLineCount = markdownOutput.split('\n').length;

    const showHint = useCallback((message: string) => {
        setHint(message);
        setIsHintFadingOut(false);
        setTimeout(() => setIsHintFadingOut(true), 1700);
        setTimeout(() => {
            setHint('');
            setIsHintFadingOut(false);
        }, 2000);
    }, []);

    const handleCopy = useCallback(async () => {
        if (!markdownOutput.trim()) return;
        try {
            await navigator.clipboard.writeText(markdownOutput);
            showHint('已复制 Markdown');
        } catch {
            showHint('复制失败，请手动选择复制');
        }
    }, [markdownOutput, showHint]);

    const handleDownload = useCallback(() => {
        if (!markdownOutput.trim()) return;
        const blob = new Blob([markdownOutput], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = DEFAULT_FILENAME;
        link.click();
        URL.revokeObjectURL(url);
        showHint('已下载 .md 文件');
    }, [markdownOutput, showHint]);

    const handleImport = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = typeof reader.result === 'string' ? reader.result : '';
            setHtmlInput(text);
            showHint(`已导入 ${file.name}`);
        };
        reader.readAsText(file);
    }, [showHint]);

    const handleClear = useCallback(() => {
        if (!htmlInput.trim() && !markdownOutput.trim()) return;
        if (window.confirm('确定清空当前内容吗？')) {
            setHtmlInput('');
            setMarkdownOutput('');
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [htmlInput, markdownOutput]);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        setHtmlInput(saved ?? DEFAULT_HTML);
    }, []);

    useEffect(() => {
        if (convertTimeoutRef.current) clearTimeout(convertTimeoutRef.current);

        convertTimeoutRef.current = setTimeout(() => {
            if (!htmlInput.trim()) {
                setMarkdownOutput('');
                return;
            }
            try {
                setMarkdownOutput(convertHtmlToMarkdown(htmlInput));
            } catch {
                setMarkdownOutput('');
            }
        }, 250);

        return () => {
            if (convertTimeoutRef.current) clearTimeout(convertTimeoutRef.current);
        };
    }, [htmlInput]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, htmlInput);
    }, [htmlInput]);

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
                    HTML 转 MD
                </p>
                <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                    粘贴网页或公众号 HTML，自动转换为 GFM Markdown，完全在浏览器本地运行。
                </p>
            </div>

            <div className="w-full max-w-7xl">
                <div className="mb-3 flex flex-col gap-3 rounded-xl border border-border-light bg-surface-light p-3 shadow-sm dark:border-border-dark dark:bg-surface-dark sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        支持标准 HTML 与微信公众号文章，自动清理样式与冗余标签
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".html,.htm,.txt"
                            className="hidden"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleImport(file);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 rounded-lg border border-border-light px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-border-dark dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <span className="material-symbols-outlined text-lg">upload_file</span>
                            上传 .html
                        </button>
                        <button
                            type="button"
                            onClick={handleCopy}
                            disabled={!markdownOutput.trim()}
                            className="flex items-center gap-1 rounded-lg border border-border-light px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-dark dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <span className="material-symbols-outlined text-lg">content_copy</span>
                            复制
                        </button>
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={!markdownOutput.trim()}
                            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            下载 .md
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex items-center gap-1 rounded-lg border border-border-light px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-border-dark dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <span className="material-symbols-outlined text-lg">delete</span>
                            清空
                        </button>
                    </div>
                </div>

                <div className="mb-3 flex rounded-lg border border-border-light bg-gray-100 p-1 dark:border-border-dark dark:bg-gray-800 md:hidden">
                    {(['html', 'markdown'] as MobilePane[]).map(pane => (
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
                            {pane === 'html' ? 'HTML 输入' : 'Markdown 输出'}
                        </button>
                    ))}
                </div>

                <div className="grid h-[calc(100vh-18rem)] min-h-[480px] grid-cols-1 gap-4 md:grid-cols-2">
                    <div className={`flex flex-col overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark ${mobilePane !== 'html' ? 'hidden md:flex' : 'flex'}`}>
                        <div className="flex items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">HTML 输入</span>
                            <span className="text-xs text-gray-400">{htmlLineCount} 行 · {htmlInput.length} 字符</span>
                        </div>
                        <textarea
                            value={htmlInput}
                            onChange={e => setHtmlInput(e.target.value)}
                            spellCheck={false}
                            className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 outline-none dark:text-gray-100"
                            placeholder="在此粘贴 HTML 源码..."
                        />
                    </div>

                    <div className={`flex flex-col overflow-hidden rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark ${mobilePane !== 'markdown' ? 'hidden md:flex' : 'flex'}`}>
                        <div className="flex items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Markdown 输出</span>
                            <span className="text-xs text-gray-400">{mdLineCount} 行 · {markdownOutput.length} 字符</span>
                        </div>
                        <textarea
                            readOnly
                            value={markdownOutput}
                            spellCheck={false}
                            className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-gray-900 outline-none dark:text-gray-100"
                            placeholder="在左侧粘贴 HTML，转换后的 Markdown 会显示在这里。"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HtmlToMarkdownTool;
