import { renderMarkdown } from './renderMarkdown';
import { loadHighlightJs } from './loadHighlightJs';

export type WechatThemeId = 'elegant' | 'minimal' | 'tech-blue' | 'warm-orange';

export interface WechatTheme {
    id: WechatThemeId;
    name: string;
    primary: string;
    heading: string;
    text: string;
    secondary: string;
    quoteBorder: string;
    quoteBg: string;
    codeBg: string;
    codeBorder: string;
    tableBorder: string;
    tableHeaderBg: string;
    link: string;
}

export const WECHAT_THEMES: Record<WechatThemeId, WechatTheme> = {
    elegant: {
        id: 'elegant',
        name: '雅致',
        primary: '#576b95',
        heading: '#333333',
        text: '#3f3f3f',
        secondary: '#888888',
        quoteBorder: '#576b95',
        quoteBg: '#f7f7f7',
        codeBg: '#f6f8fa',
        codeBorder: '#e1e4e8',
        tableBorder: '#dfe2e5',
        tableHeaderBg: '#f6f8fa',
        link: '#576b95',
    },
    minimal: {
        id: 'minimal',
        name: '极简',
        primary: '#333333',
        heading: '#1a1a1a',
        text: '#333333',
        secondary: '#999999',
        quoteBorder: '#cccccc',
        quoteBg: '#fafafa',
        codeBg: '#f5f5f5',
        codeBorder: '#e8e8e8',
        tableBorder: '#e8e8e8',
        tableHeaderBg: '#fafafa',
        link: '#333333',
    },
    'tech-blue': {
        id: 'tech-blue',
        name: '科技蓝',
        primary: '#1890ff',
        heading: '#1a1a1a',
        text: '#333333',
        secondary: '#8c8c8c',
        quoteBorder: '#1890ff',
        quoteBg: '#e6f7ff',
        codeBg: '#f0f5ff',
        codeBorder: '#adc6ff',
        tableBorder: '#91d5ff',
        tableHeaderBg: '#e6f7ff',
        link: '#1890ff',
    },
    'warm-orange': {
        id: 'warm-orange',
        name: '暖心橙',
        primary: '#fa8c16',
        heading: '#262626',
        text: '#434343',
        secondary: '#8c8c8c',
        quoteBorder: '#fa8c16',
        quoteBg: '#fff7e6',
        codeBg: '#fff2e8',
        codeBorder: '#ffbb96',
        tableBorder: '#ffd591',
        tableHeaderBg: '#fff7e6',
        link: '#fa8c16',
    },
};

const HLJS_INLINE_COLORS: Record<string, string> = {
    'hljs-keyword': '#d73a49',
    'hljs-string': '#032f62',
    'hljs-comment': '#6a737d',
    'hljs-number': '#005cc5',
    'hljs-function': '#6f42c1',
    'hljs-title': '#6f42c1',
    'hljs-class': '#6f42c1',
    'hljs-built_in': '#005cc5',
    'hljs-literal': '#005cc5',
    'hljs-attr': '#005cc5',
    'hljs-variable': '#e36209',
    'hljs-tag': '#22863a',
    'hljs-name': '#22863a',
    'hljs-attribute': '#6f42c1',
    'hljs-meta': '#6a737d',
    'hljs-regexp': '#032f62',
    'hljs-symbol': '#e36209',
    'hljs-selector-tag': '#22863a',
    'hljs-selector-id': '#6f42c1',
    'hljs-selector-class': '#6f42c1',
    'hljs-type': '#445588',
};

const mergeStyle = (element: Element, style: string) => {
    const existing = element.getAttribute('style') || '';
    element.setAttribute('style', existing ? `${existing};${style}` : style);
};

const highlightCodeBlocks = async (root: HTMLElement) => {
    await loadHighlightJs();
    if (!window.hljs) return;

    root.querySelectorAll('pre code').forEach(block => {
        window.hljs?.highlightElement(block as HTMLElement);
    });
};

const inlineHljsStyles = (root: HTMLElement) => {
    root.querySelectorAll('[class*="hljs"]').forEach(node => {
        const element = node as HTMLElement;
        const classes = element.className.split(/\s+/).filter(Boolean);
        const colors = classes
            .map(cls => HLJS_INLINE_COLORS[cls])
            .filter(Boolean);

        if (colors.length > 0) {
            mergeStyle(element, `color:${colors[colors.length - 1]}`);
        }

        element.removeAttribute('class');
    });
};

const applyWechatStyles = (root: HTMLElement, theme: WechatTheme) => {
    mergeStyle(root, `font-size:16px;color:${theme.text};line-height:1.75;letter-spacing:0.5px;word-break:break-word;`);

    root.querySelectorAll('h1').forEach(el => {
        mergeStyle(el, `font-size:22px;font-weight:bold;color:${theme.heading};margin:24px 0 16px;line-height:1.4;border-bottom:2px solid ${theme.primary};padding-bottom:8px;`);
    });

    root.querySelectorAll('h2').forEach(el => {
        mergeStyle(el, `font-size:20px;font-weight:bold;color:${theme.heading};margin:20px 0 12px;line-height:1.4;border-left:4px solid ${theme.primary};padding-left:10px;`);
    });

    root.querySelectorAll('h3').forEach(el => {
        mergeStyle(el, `font-size:18px;font-weight:bold;color:${theme.heading};margin:16px 0 10px;line-height:1.4;`);
    });

    root.querySelectorAll('h4, h5, h6').forEach(el => {
        mergeStyle(el, `font-size:16px;font-weight:bold;color:${theme.heading};margin:14px 0 8px;line-height:1.4;`);
    });

    root.querySelectorAll('p').forEach(el => {
        mergeStyle(el, `margin:12px 0;color:${theme.text};line-height:1.75;font-size:16px;`);
    });

    root.querySelectorAll('blockquote').forEach(el => {
        mergeStyle(el, `margin:16px 0;padding:12px 16px;border-left:4px solid ${theme.quoteBorder};background:${theme.quoteBg};color:${theme.secondary};font-size:15px;line-height:1.7;`);
    });

    root.querySelectorAll('a').forEach(el => {
        mergeStyle(el, `color:${theme.link};text-decoration:underline;`);
    });

    root.querySelectorAll('strong').forEach(el => {
        mergeStyle(el, `font-weight:bold;color:${theme.heading};`);
    });

    root.querySelectorAll('em').forEach(el => {
        mergeStyle(el, 'font-style:italic;');
    });

    root.querySelectorAll('del').forEach(el => {
        mergeStyle(el, 'text-decoration:line-through;color:#999999;');
    });

    root.querySelectorAll('ul, ol').forEach(el => {
        mergeStyle(el, `margin:12px 0;padding-left:24px;color:${theme.text};line-height:1.75;`);
    });

    root.querySelectorAll('li').forEach(el => {
        mergeStyle(el, `margin:6px 0;color:${theme.text};line-height:1.75;`);
    });

    root.querySelectorAll('hr').forEach(el => {
        mergeStyle(el, `margin:24px 0;border:none;border-top:1px solid ${theme.tableBorder};`);
    });

    root.querySelectorAll('img').forEach(el => {
        mergeStyle(el, 'max-width:100%;height:auto;display:block;margin:16px auto;border-radius:4px;');
    });

    root.querySelectorAll('pre').forEach(el => {
        mergeStyle(el, `margin:16px 0;padding:16px;background:${theme.codeBg};border:1px solid ${theme.codeBorder};border-radius:6px;overflow-x:auto;font-size:14px;line-height:1.6;`);
    });

    root.querySelectorAll('pre code').forEach(el => {
        mergeStyle(el, `font-family:Consolas,Monaco,"Courier New",monospace;font-size:13px;color:${theme.text};background:transparent;white-space:pre-wrap;word-break:break-all;`);
        el.removeAttribute('class');
    });

    root.querySelectorAll(':not(pre) > code').forEach(el => {
        mergeStyle(el, `padding:2px 6px;background:${theme.codeBg};border:1px solid ${theme.codeBorder};border-radius:4px;font-family:Consolas,Monaco,"Courier New",monospace;font-size:14px;color:${theme.primary};`);
        el.removeAttribute('class');
    });

    root.querySelectorAll('table').forEach(el => {
        mergeStyle(el, `width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;border:1px solid ${theme.tableBorder};`);
    });

    root.querySelectorAll('th').forEach(el => {
        mergeStyle(el, `padding:10px 12px;border:1px solid ${theme.tableBorder};background:${theme.tableHeaderBg};font-weight:bold;color:${theme.heading};text-align:left;`);
    });

    root.querySelectorAll('td').forEach(el => {
        mergeStyle(el, `padding:10px 12px;border:1px solid ${theme.tableBorder};color:${theme.text};text-align:left;`);
    });
};

const parseHtmlRoot = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="wechat-root">${html}</div>`, 'text/html');
    const root = doc.getElementById('wechat-root');
    if (!root) {
        throw new Error('HTML 解析失败');
    }
    return root;
};

export const renderWechatMarkdown = async (
    markdown: string,
    themeId: WechatThemeId
): Promise<string> => {
    const theme = WECHAT_THEMES[themeId];
    const rawHtml = await renderMarkdown(markdown);
    const root = parseHtmlRoot(rawHtml);

    await highlightCodeBlocks(root);
    applyWechatStyles(root, theme);
    inlineHljsStyles(root);

    return root.innerHTML;
};

export const wrapWechatHtml = (innerHtml: string, themeId: WechatThemeId): string => {
    const theme = WECHAT_THEMES[themeId];
    return `<section style="font-size:16px;color:${theme.text};line-height:1.75;letter-spacing:0.5px;word-break:break-word;">${innerHtml}</section>`;
};

export const copyWechatHtml = async (innerHtml: string, themeId: WechatThemeId): Promise<void> => {
    const html = wrapWechatHtml(innerHtml, themeId);
    const plainText = new DOMParser()
        .parseFromString(html, 'text/html')
        .body.textContent || '';

    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([plainText], { type: 'text/plain' });

    if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob,
            }),
        ]);
        return;
    }

    await navigator.clipboard.writeText(html);
};
