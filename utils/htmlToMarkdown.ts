import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const STRIP_TAGS = ['script', 'style', 'meta', 'link', 'noscript'];

const detectCodeLanguage = (el: Element | null): string => {
    if (!el) return '';

    const dataLang = el.getAttribute('data-lang') || el.getAttribute('data-language');
    if (dataLang) return dataLang.trim();

    const className = el.getAttribute('class') || '';
    const langMatch = className.match(/(?:language-|lang-|hljs-)([\w-]+)/i);
    if (langMatch) return langMatch[1].replace(/^hljs-/, '');

    return '';
};

const stripAttributes = (root: HTMLElement) => {
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode as Element | null;

    while (node) {
        if (node instanceof HTMLElement) {
            const attrs = [...node.attributes];
            for (const attr of attrs) {
                const name = attr.name.toLowerCase();
                if (name === 'style' || name === 'class' || name.startsWith('data-')) {
                    if (node.tagName === 'IMG' && (name === 'data-src' || name === 'data-original')) {
                        continue;
                    }
                    node.removeAttribute(attr.name);
                }
            }
        }
        node = walker.nextNode() as Element | null;
    }
};

const normalizeWeChatImages = (root: HTMLElement) => {
    root.querySelectorAll('figure').forEach(figure => {
        const img = figure.querySelector('img');
        if (!img) return;

        const src = img.getAttribute('data-src')
            || img.getAttribute('data-original')
            || img.getAttribute('src');
        if (src) img.setAttribute('src', src);

        const caption = figure.querySelector('figcaption');
        if (caption?.textContent?.trim()) {
            const p = root.ownerDocument.createElement('p');
            p.textContent = caption.textContent.trim();
            figure.insertAdjacentElement('afterend', p);
        }

        figure.replaceWith(img);
    });

    root.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('data-src') || img.getAttribute('data-original');
        if (src && !img.getAttribute('src')) {
            img.setAttribute('src', src);
        }
    });
};

const mergeBrSeparatedCode = (root: HTMLElement) => {
    root.querySelectorAll('section, div').forEach(container => {
        const brCount = container.querySelectorAll('br').length;
        const textLength = container.textContent?.trim().length ?? 0;
        if (brCount < 2 || textLength === 0) return;

        const hasBlockChild = container.querySelector('p, ul, ol, table, pre, h1, h2, h3, h4, h5, h6, blockquote');
        if (hasBlockChild) return;

        const codeText = container.innerHTML
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();

        if (!codeText || !codeText.includes('\n')) return;

        const pre = root.ownerDocument.createElement('pre');
        const code = root.ownerDocument.createElement('code');
        code.textContent = codeText;
        pre.appendChild(code);
        container.replaceWith(pre);
    });
};

const convertStyledQuotes = (root: HTMLElement) => {
    root.querySelectorAll('section, div, p').forEach(el => {
        const style = el.getAttribute('style') || '';
        if (!/border-left/i.test(style)) return;

        const blockquote = root.ownerDocument.createElement('blockquote');
        blockquote.innerHTML = el.innerHTML;
        el.replaceWith(blockquote);
    });
};

const extractMainContent = (doc: Document): HTMLElement => {
    const wechatContent = doc.getElementById('js_content');
    if (wechatContent) return wechatContent;

    const article = doc.querySelector('article');
    if (article instanceof HTMLElement) return article;

    const body = doc.body;
    if (body) return body;

    const wrapper = doc.createElement('div');
    wrapper.innerHTML = doc.documentElement.innerHTML;
    return wrapper;
};

export const preprocessHtml = (html: string): string => {
    const trimmed = html.trim();
    if (!trimmed) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');

    STRIP_TAGS.forEach(tag => {
        doc.querySelectorAll(tag).forEach(el => el.remove());
    });

    const root = extractMainContent(doc);
    normalizeWeChatImages(root);
    mergeBrSeparatedCode(root);
    convertStyledQuotes(root);
    stripAttributes(root);

    return root.innerHTML.trim();
};

let turndownService: TurndownService | null = null;

const getTurndownService = (): TurndownService => {
    if (turndownService) return turndownService;

    const service = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
        emDelimiter: '*',
    });

    service.use(gfm);

    service.addRule('fencedCodeBlockWithLang', {
        filter: node => node.nodeName === 'PRE',
        replacement: (_content, node) => {
            const element = node as HTMLElement;
            const codeEl = element.querySelector('code');
            const text = (codeEl ?? element).textContent ?? '';
            const lang = detectCodeLanguage(codeEl ?? element);
            const fence = lang ? `\`\`\`${lang}` : '```';
            return `\n\n${fence}\n${text.replace(/\n$/, '')}\n\`\`\`\n\n`;
        },
    });

    turndownService = service;
    return service;
};

export const convertHtmlToMarkdown = (html: string): string => {
    const cleaned = preprocessHtml(html);
    if (!cleaned) return '';

    const markdown = getTurndownService().turndown(cleaned);
    return markdown
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+\n/g, '\n')
        .trim();
};
