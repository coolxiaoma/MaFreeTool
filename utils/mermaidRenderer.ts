import mermaid from 'mermaid';

const STORAGE_KEY = 'freetool-mermaid-diagram';
const EXPORT_BASENAME = 'mafreetool_mermaid';
let renderCounter = 0;

export const MERMAID_EXAMPLES: Record<string, { label: string; code: string }> = {
    flowchart: {
        label: '流程图',
        code: `flowchart TD
    A[用户提交表单] --> B{数据验证}
    B -->|通过| C[写入数据库]
    B -->|失败| D[返回错误提示]
    C --> E[发送确认邮件]
    E --> F[结束]`,
    },
    sequence: {
        label: '时序图',
        code: `sequenceDiagram
    participant 前端
    participant 后端
    participant 数据库
    前端->>后端: POST /api/login
    后端->>数据库: 查询用户信息
    数据库-->>后端: 返回用户记录
    后端-->>前端: 200 OK + JWT Token`,
    },
    class: {
        label: '类图',
        code: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +bark()
    }
    class Cat {
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
    },
    er: {
        label: 'ER 图',
        code: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : includes
    USER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        date created_at
    }`,
    },
    gantt: {
        label: '甘特图',
        code: `gantt
    title 功能迭代计划
    dateFormat YYYY-MM-DD
    section 设计
        UI 原型       :done, des1, 2025-01-01, 7d
        设计评审      :done, des2, after des1, 2d
    section 开发
        前端开发      :active, dev1, 2025-01-10, 14d
        后端 API      :dev2, 2025-01-10, 10d
    section 测试
        集成测试      :test1, after dev1, 5d`,
    },
    pie: {
        label: '饼图',
        code: `pie title 技术栈占比
    "React" : 45
    "TypeScript" : 30
    "Tailwind" : 15
    "其它" : 10`,
    },
    state: {
        label: '状态图',
        code: `stateDiagram-v2
    [*] --> 待处理
    待处理 --> 进行中: 开始
    进行中 --> 已完成: 完成
    进行中 --> 已取消: 取消
    已完成 --> [*]
    已取消 --> [*]`,
    },
    journey: {
        label: '用户旅程',
        code: `journey
    title 用户购物体验
    section 浏览
      打开首页: 5: 用户
      搜索商品: 4: 用户
    section 购买
      加入购物车: 4: 用户
      完成支付: 3: 用户, 系统
    section 售后
      查看物流: 4: 用户
      确认收货: 5: 用户`,
    },
};

export const DEFAULT_MERMAID_CODE = MERMAID_EXAMPLES.flowchart.code;

const isDarkTheme = () => document.documentElement.classList.contains('dark');

const initMermaid = () => {
    mermaid.initialize({
        startOnLoad: false,
        theme: isDarkTheme() ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'Inter, sans-serif',
    });
};

export const renderMermaid = async (code: string): Promise<string> => {
    initMermaid();
    const id = `mermaid-render-${++renderCounter}`;
    const { svg } = await mermaid.render(id, code.trim());
    return svg;
};

export const loadSavedMermaidCode = (): string => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ?? DEFAULT_MERMAID_CODE;
    } catch {
        return DEFAULT_MERMAID_CODE;
    }
};

export const saveMermaidCode = (code: string) => {
    try {
        localStorage.setItem(STORAGE_KEY, code);
    } catch {
        // ignore quota errors
    }
};

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

export const exportMermaidSvg = (svg: string) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `${EXPORT_BASENAME}.svg`);
};

export const exportMermaidPng = async (svg: string): Promise<void> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = doc.documentElement;

    const viewBox = svgElement.getAttribute('viewBox');
    let width = parseFloat(svgElement.getAttribute('width') || '0');
    let height = parseFloat(svgElement.getAttribute('height') || '0');

    if (viewBox) {
        const parts = viewBox.split(/\s+/).map(Number);
        if (parts.length === 4) {
            width = parts[2];
            height = parts[3];
        }
    }

    if (!width || !height) {
        width = 1200;
        height = 800;
    }

    const scale = Math.max(window.devicePixelRatio || 1, 2);
    const serialized = new XMLSerializer().serializeToString(svgElement);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

    await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;

            const context = canvas.getContext('2d');
            if (!context) {
                reject(new Error('无法创建画布'));
                return;
            }

            context.fillStyle = isDarkTheme() ? '#0f1323' : '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.scale(scale, scale);
            context.drawImage(image, 0, 0, width, height);

            canvas.toBlob(blob => {
                if (!blob) {
                    reject(new Error('PNG 导出失败'));
                    return;
                }
                downloadBlob(blob, `${EXPORT_BASENAME}.png`);
                resolve();
            }, 'image/png');
        };
        image.onerror = () => reject(new Error('SVG 转 PNG 失败'));
        image.src = dataUrl;
    });
};
