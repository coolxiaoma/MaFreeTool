import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { loadHighlightJs } from './loadHighlightJs';

let configured = false;

const configureMarked = () => {
    if (configured) return;

    marked.use({
        gfm: true,
        breaks: true,
        async: false,
    });

    configured = true;
};

export const renderMarkdown = async (markdown: string): Promise<string> => {
    configureMarked();
    await loadHighlightJs();

    const rawHtml = marked.parse(markdown, { async: false }) as string;

    return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'rel', 'class'],
    });
};

export const highlightPreviewCode = (container: HTMLElement | null) => {
    if (!container || !window.hljs) return;
    container.querySelectorAll('pre code').forEach(block => {
        window.hljs?.highlightElement(block as HTMLElement);
    });
};
