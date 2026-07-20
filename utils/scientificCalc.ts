export type AngleMode = 'deg' | 'rad';

export interface CalcHistoryItem {
    id: string;
    expression: string;
    result: string;
    timestamp: number;
}

type Token =
    | { type: 'number'; value: number }
    | { type: 'op'; value: string }
    | { type: 'func'; value: string }
    | { type: 'lparen' }
    | { type: 'rparen' }
    | { type: 'comma' }
    | { type: 'const'; value: 'pi' | 'e' | 'ans' };

const FUNC_NAMES = new Set([
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'ln', 'log', 'sqrt', 'cbrt', 'exp', 'abs',
    'factorial', 'root',
]);

const toRad = (value: number, mode: AngleMode) => (mode === 'deg' ? (value * Math.PI) / 180 : value);
const fromRad = (value: number, mode: AngleMode) => (mode === 'deg' ? (value * 180) / Math.PI : value);

const factorial = (n: number): number => {
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        throw new Error('阶乘仅支持非负整数');
    }
    if (n > 170) throw new Error('阶乘结果过大');
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
};

const formatResult = (value: number): string => {
    if (!Number.isFinite(value)) throw new Error('计算结果无效');
    if (Object.is(value, -0)) return '0';

    const abs = Math.abs(value);
    if ((abs !== 0 && abs < 1e-6) || abs >= 1e12) {
        return value.toExponential(10).replace(/\.?0+e/, 'e').replace(/e\+?/, 'e');
    }

    const rounded = Number(value.toPrecision(12));
    return String(rounded);
};

const tokenize = (input: string): Token[] => {
    const src = input
        .replace(/π/g, 'pi')
        .replace(/÷/g, '/')
        .replace(/×/g, '*')
        .replace(/−/g, '-')
        .replace(/\^/g, '**')
        .replace(/√/g, 'sqrt')
        .replace(/\s+/g, '')
        .toLowerCase();

    const tokens: Token[] = [];
    let i = 0;

    while (i < src.length) {
        const ch = src[i];

        if (/[0-9.]/.test(ch)) {
            let num = '';
            while (i < src.length && /[0-9.]/.test(src[i])) {
                num += src[i++];
            }
            if (i < src.length && src[i] === 'e' && /[+\-\d]/.test(src[i + 1] || '')) {
                num += src[i++];
                if (src[i] === '+' || src[i] === '-') num += src[i++];
                while (i < src.length && /\d/.test(src[i])) num += src[i++];
            }
            const value = Number(num);
            if (!Number.isFinite(value)) throw new Error('数字格式错误');
            tokens.push({ type: 'number', value });
            continue;
        }

        if (/[a-z]/.test(ch)) {
            let name = '';
            while (i < src.length && /[a-z]/.test(src[i])) name += src[i++];

            if (name === 'pi' || name === 'e' || name === 'ans') {
                tokens.push({ type: 'const', value: name });
            } else if (FUNC_NAMES.has(name)) {
                tokens.push({ type: 'func', value: name });
            } else {
                throw new Error(`未知标识符: ${name}`);
            }
            continue;
        }

        if (ch === '(') {
            tokens.push({ type: 'lparen' });
            i++;
            continue;
        }
        if (ch === ')') {
            tokens.push({ type: 'rparen' });
            i++;
            continue;
        }
        if (ch === ',') {
            tokens.push({ type: 'comma' });
            i++;
            continue;
        }
        if (ch === '!' ) {
            tokens.push({ type: 'op', value: '!' });
            i++;
            continue;
        }
        if (ch === '%' ) {
            tokens.push({ type: 'op', value: '%' });
            i++;
            continue;
        }
        if (src.startsWith('**', i)) {
            tokens.push({ type: 'op', value: '**' });
            i += 2;
            continue;
        }
        if ('+-*/'.includes(ch)) {
            tokens.push({ type: 'op', value: ch });
            i++;
            continue;
        }

        throw new Error(`无法识别的字符: ${ch}`);
    }

    return tokens;
};

class Parser {
    private pos = 0;

    constructor(
        private tokens: Token[],
        private mode: AngleMode,
        private ans: number,
    ) {}

    private peek(): Token | undefined {
        return this.tokens[this.pos];
    }

    private consume(): Token {
        const token = this.tokens[this.pos++];
        if (!token) throw new Error('表达式不完整');
        return token;
    }

    private match(type: Token['type'], value?: string): boolean {
        const token = this.peek();
        if (!token || token.type !== type) return false;
        if (value !== undefined && 'value' in token && token.value !== value) return false;
        this.pos++;
        return true;
    }

    parse(): number {
        if (this.tokens.length === 0) throw new Error('请输入表达式');
        const value = this.parseExpression();
        if (this.pos < this.tokens.length) throw new Error('表达式语法错误');
        return value;
    }

    private parseExpression(): number {
        let left = this.parseTerm();
        while (true) {
            if (this.match('op', '+')) left += this.parseTerm();
            else if (this.match('op', '-')) left -= this.parseTerm();
            else break;
        }
        return left;
    }

    private parseTerm(): number {
        let left = this.parsePower();
        while (true) {
            if (this.match('op', '*')) left *= this.parsePower();
            else if (this.match('op', '/')) {
                const right = this.parsePower();
                if (right === 0) throw new Error('除数不能为 0');
                left /= right;
            } else break;
        }
        return left;
    }

    private parsePower(): number {
        const left = this.parseUnary();
        if (this.match('op', '**')) {
            const right = this.parsePower();
            return Math.pow(left, right);
        }
        return left;
    }

    private parseUnary(): number {
        if (this.match('op', '+')) return this.parseUnary();
        if (this.match('op', '-')) return -this.parseUnary();
        return this.parsePostfix();
    }

    private parsePostfix(): number {
        let value = this.parsePrimary();
        while (true) {
            if (this.match('op', '!')) value = factorial(value);
            else if (this.match('op', '%')) value = value / 100;
            else break;
        }
        return value;
    }

    private parsePrimary(): number {
        const token = this.peek();
        if (!token) throw new Error('表达式不完整');

        if (token.type === 'number') {
            this.consume();
            return token.value;
        }

        if (token.type === 'const') {
            this.consume();
            if (token.value === 'pi') return Math.PI;
            if (token.value === 'e') return Math.E;
            return this.ans;
        }

        if (token.type === 'func') {
            this.consume();
            if (!this.match('lparen')) throw new Error(`${token.value} 后需要括号`);
            const args: number[] = [this.parseExpression()];
            while (this.match('comma')) args.push(this.parseExpression());
            if (!this.match('rparen')) throw new Error('缺少右括号');
            return this.evalFunc(token.value, args);
        }

        if (this.match('lparen')) {
            const value = this.parseExpression();
            if (!this.match('rparen')) throw new Error('缺少右括号');
            return value;
        }

        throw new Error('表达式语法错误');
    }

    private evalFunc(name: string, args: number[]): number {
        const [a, b] = args;
        switch (name) {
            case 'sin': return Math.sin(toRad(a, this.mode));
            case 'cos': return Math.cos(toRad(a, this.mode));
            case 'tan': return Math.tan(toRad(a, this.mode));
            case 'asin': return fromRad(Math.asin(a), this.mode);
            case 'acos': return fromRad(Math.acos(a), this.mode);
            case 'atan': return fromRad(Math.atan(a), this.mode);
            case 'ln': return Math.log(a);
            case 'log': return Math.log10(a);
            case 'sqrt': return Math.sqrt(a);
            case 'cbrt': return Math.cbrt(a);
            case 'exp': return Math.exp(a);
            case 'abs': return Math.abs(a);
            case 'factorial': return factorial(a);
            case 'root': {
                if (args.length < 2) throw new Error('y√x 需要两个参数');
                if (a === 0) throw new Error('根指数不能为 0');
                return Math.pow(b, 1 / a);
            }
            default:
                throw new Error(`未知函数: ${name}`);
        }
    }
}

export const evaluateExpression = (
    expression: string,
    mode: AngleMode,
    ans = 0,
): { ok: true; value: number; display: string } | { ok: false; error: string } => {
    try {
        const tokens = tokenize(expression);
        const parser = new Parser(tokens, mode, ans);
        const value = parser.parse();
        return { ok: true, value, display: formatResult(value) };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : '计算失败' };
    }
};

export const tryLivePreview = (
    expression: string,
    mode: AngleMode,
    ans = 0,
): string | null => {
    if (!expression.trim()) return null;
    const result = evaluateExpression(expression, mode, ans);
    return result.ok ? result.display : null;
};
