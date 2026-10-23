import { rowsForPeriod, rowsOf, sumRows } from '@/engine/data';
import type { Cell, Scope } from '@/schema/types';

export type Value = Cell | null;

type Token =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'id'; v: string }
  | { k: 'op'; v: string }
  | { k: 'lp' | 'rp' | 'comma' | 'dot' | 'q' | 'colon' };

const TWO_CHAR = new Set(['==', '!=', '<=', '>=', '&&', '||']);

export class ExprError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExprError';
  }
}

export function evaluate(input: string, scope: Scope): Value {
  const parser = new Parser(tokenize(input), scope, false);
  const value = parser.parseExpression();
  parser.finish();
  return value;
}

export function evaluateMath(input: string): Value {
  if (!/^[\d+\-*/%().\s]+$/.test(input)) return 'error';
  try {
    const parser = new Parser(tokenize(input), { state: {}, data: {} }, true);
    const value = parser.parseExpression();
    parser.finish();
    return typeof value === 'number' && Number.isFinite(value) ? round(value) : 'error';
  } catch {
    return 'error';
  }
}

export function interpolate(text: string, scope: Scope): string {
  return text.replace(/\{\{([\s\S]+?)\}\}/g, (_, expression: string) => {
    try {
      return formatValue(evaluate(expression.trim(), scope));
    } catch {
      return '·';
    }
  });
}

export function formatValue(value: Value, format?: 'number' | 'currency' | 'percent'): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (format === 'currency') {
      const rounded = Math.round(value);
      const sign = rounded < 0 ? '-' : '';
      return `${sign}$${Math.abs(rounded).toLocaleString('en-US')}`;
    }
    if (format === 'percent') return `${Math.round(value * 100)}%`;
    const rounded = Math.round(value * 100) / 100;
    return String(rounded);
  }
  if (value == null) return '';
  return String(value);
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index] ?? '';
    if (char === ' ' || char === '\n' || char === '\t') {
      index += 1;
      continue;
    }
    if (char === '(') {
      tokens.push({ k: 'lp' });
      index += 1;
      continue;
    }
    if (char === ')') {
      tokens.push({ k: 'rp' });
      index += 1;
      continue;
    }
    if (char === ',') {
      tokens.push({ k: 'comma' });
      index += 1;
      continue;
    }
    if (char === '.') {
      tokens.push({ k: 'dot' });
      index += 1;
      continue;
    }
    if (char === '?') {
      tokens.push({ k: 'q' });
      index += 1;
      continue;
    }
    if (char === ':') {
      tokens.push({ k: 'colon' });
      index += 1;
      continue;
    }
    const pair = input.slice(index, index + 2);
    if (TWO_CHAR.has(pair)) {
      tokens.push({ k: 'op', v: pair });
      index += 2;
      continue;
    }
    if ('+-*/%!<>'.includes(char)) {
      tokens.push({ k: 'op', v: char });
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      index += 1;
      let text = '';
      while (index < input.length && input[index] !== quote) {
        if (input[index] === '\\' && index + 1 < input.length) {
          text += input[index + 1];
          index += 2;
          continue;
        }
        text += input[index];
        index += 1;
      }
      index += 1;
      tokens.push({ k: 'str', v: text });
      continue;
    }
    if (char >= '0' && char <= '9') {
      let end = index + 1;
      while (end < input.length && /[0-9.]/.test(input[end] ?? '')) end += 1;
      const raw = input.slice(index, end);
      const value = Number(raw);
      if (Number.isNaN(value)) throw new ExprError(`Bad number ${raw}`);
      tokens.push({ k: 'num', v: value });
      index = end;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < input.length && /[A-Za-z0-9_]/.test(input[end] ?? '')) end += 1;
      tokens.push({ k: 'id', v: input.slice(index, end) });
      index = end;
      continue;
    }
    throw new ExprError(`Unexpected "${char}"`);
  }
  return tokens;
}

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly scope: Scope,
    private readonly mathOnly: boolean,
  ) {}

  finish(): void {
    if (this.index < this.tokens.length) throw new ExprError('Unexpected token');
  }

  parseExpression(): Value {
    return this.parseTernary();
  }

  private parseTernary(): Value {
    const condition = this.parseOr();
    if (this.match('q')) {
      const yes = this.parseExpression();
      this.expect('colon');
      const no = this.parseExpression();
      return truthy(condition) ? yes : no;
    }
    return condition;
  }

  private parseOr(): Value {
    let left = this.parseAnd();
    while (this.matchOp('||')) {
      const right = this.parseAnd();
      left = truthy(left) || truthy(right);
    }
    return left;
  }

  private parseAnd(): Value {
    let left = this.parseEquality();
    while (this.matchOp('&&')) {
      const right = this.parseEquality();
      left = truthy(left) && truthy(right);
    }
    return left;
  }

  private parseEquality(): Value {
    let left = this.parseComparison();
    for (;;) {
      if (this.matchOp('==')) {
        left = same(left, this.parseComparison());
      } else if (this.matchOp('!=')) {
        left = !same(left, this.parseComparison());
      } else {
        break;
      }
    }
    return left;
  }

  private parseComparison(): Value {
    let left = this.parseSum();
    for (;;) {
      if (this.matchOp('<')) left = asNumber(left) < asNumber(this.parseSum());
      else if (this.matchOp('>')) left = asNumber(left) > asNumber(this.parseSum());
      else if (this.matchOp('<=')) left = asNumber(left) <= asNumber(this.parseSum());
      else if (this.matchOp('>=')) left = asNumber(left) >= asNumber(this.parseSum());
      else break;
    }
    return left;
  }

  private parseSum(): Value {
    let left = this.parseProduct();
    for (;;) {
      if (this.matchOp('+')) left = asNumber(left) + asNumber(this.parseProduct());
      else if (this.matchOp('-')) left = asNumber(left) - asNumber(this.parseProduct());
      else break;
    }
    return left;
  }

  private parseProduct(): Value {
    let left = this.parseUnary();
    for (;;) {
      if (this.matchOp('*')) left = asNumber(left) * asNumber(this.parseUnary());
      else if (this.matchOp('/')) {
        const right = asNumber(this.parseUnary());
        left = right === 0 ? 0 : asNumber(left) / right;
      } else if (this.matchOp('%')) {
        const right = asNumber(this.parseUnary());
        left = right === 0 ? 0 : asNumber(left) % right;
      } else break;
    }
    return left;
  }

  private parseUnary(): Value {
    if (this.matchOp('!')) return !truthy(this.parseUnary());
    if (this.matchOp('-')) return -asNumber(this.parseUnary());
    return this.parsePrimary();
  }

  private parsePrimary(): Value {
    const token = this.tokens[this.index];
    if (!token) throw new ExprError('Unexpected end');
    if (token.k === 'num') {
      this.index += 1;
      return token.v;
    }
    if (token.k === 'str') {
      this.index += 1;
      return token.v;
    }
    if (token.k === 'lp') {
      this.index += 1;
      const value = this.parseExpression();
      this.expect('rp');
      return value;
    }
    if (token.k === 'id') {
      if (this.mathOnly) throw new ExprError('Only math is allowed here');
      this.index += 1;
      if (token.v === 'true') return true;
      if (token.v === 'false') return false;
      if (token.v === 'null') return null;
      if (this.peek()?.k === 'lp') return this.parseCall(token.v);
      let current: unknown = this.lookup(token.v);
      while (this.match('dot')) {
        const key = this.expectId();
        if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[key];
        } else {
          current = null;
        }
      }
      return asValue(current);
    }
    throw new ExprError('Expected a value');
  }

  private parseCall(name: string): Value {
    this.expect('lp');
    const args: Value[] = [];
    if (this.peek()?.k !== 'rp') {
      args.push(this.parseExpression());
      while (this.match('comma')) args.push(this.parseExpression());
    }
    this.expect('rp');
    return callFunction(name, args, this.scope);
  }

  private lookup(name: string): unknown {
    if (name === 'state') return this.scope.state;
    if (name === 'data') return this.scope.data;
    if (name in this.scope.state) return this.scope.state[name];
    return null;
  }

  private match(kind: Token['k']): boolean {
    if (this.peek()?.k === kind) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private matchOp(operator: string): boolean {
    const token = this.peek();
    if (token?.k === 'op' && token.v === operator) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private expect(kind: Token['k']): void {
    if (!this.match(kind)) throw new ExprError(`Expected ${kind}`);
  }

  private expectId(): string {
    const token = this.peek();
    if (token?.k !== 'id') throw new ExprError('Expected a name');
    this.index += 1;
    return token.v;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }
}

function callFunction(name: string, args: Value[], scope: Scope): Value {
  const text = (index: number) => String(args[index] ?? '');
  const rows = () => rowsOf(scope.data, text(0));
  switch (name) {
    case 'sum':
      return sumRows(rows(), text(1));
    case 'count':
      return rows().length;
    case 'avg': {
      const list = rows();
      if (!list.length) return 0;
      return sumRows(list, text(1)) / list.length;
    }
    case 'sumWhere':
      return sumRows(
        rows().filter((row) => String(row[text(2)] ?? '') === text(3)),
        text(1),
      );
    case 'countWhere':
      return rows().filter((row) => String(row[text(1)] ?? '') === text(2)).length;
    case 'sumPeriod':
      return sumRows(rowsForPeriod(rows(), text(2)), text(1));
    case 'sumFiltered':
      return sumRows(
        rowsForPeriod(rows(), text(2)).filter((row) => String(row[text(3)] ?? '') === text(4)),
        text(1),
      );
    case 'round':
      return round(asNumber(args[0] ?? 0), asNumber(args[1] ?? 0));
    case 'min':
      return Math.min(...args.map((value) => asNumber(value)));
    case 'max':
      return Math.max(...args.map((value) => asNumber(value)));
    case 'len':
      return text(0).length;
    case 'num':
      return asNumber(args[0] ?? 0);
    case 'concat':
      return args.map((value) => formatValue(value)).join('');
    case 'lower':
      return text(0).toLowerCase();
    case 'upper':
      return text(0).toUpperCase();
    case 'drop':
      return text(0).slice(0, -1);
    case 'if':
      return truthy(args[0] ?? false) ? (args[1] ?? null) : (args[2] ?? null);
    case 'calc':
      return evaluateMath(text(0));
    default:
      throw new ExprError(`Unknown function ${name}`);
  }
}

function asValue(value: unknown): Value {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value == null) return null;
  return String(value);
}

function asNumber(value: Value): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function truthy(value: Value): boolean {
  return value !== false && value !== 0 && value !== '' && value != null;
}

function same(left: Value, right: Value): boolean {
  if (typeof left === 'boolean' || typeof right === 'boolean') return left === right;
  if (typeof left === 'number' || typeof right === 'number') return asNumber(left) === asNumber(right);
  return String(left ?? '') === String(right ?? '');
}

function round(value: number, digits = 0): number {
  const factor = 10 ** Math.max(0, digits);
  return Math.round(value * factor) / factor;
}
