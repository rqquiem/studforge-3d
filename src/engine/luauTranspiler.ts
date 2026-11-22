/**
 * Luau-to-Lua 5.3 transpiler for in-browser Fengari execution.
 * Handles common Roblox Luau extensions while respecting string literals and comments:
 * - `type` / `export type` declarations
 * - Parameter, local, and return type annotations (`: Type`, `:: Type`, `-> Ret`)
 * - Compound assignments (`+=`, `-=`, `*=`, `/=`, `%=`, `..=`)
 * - Inline `if cond then a else b` / `elseif` expressions
 * - `continue` statement in loops via Lua 5.3 `goto`
 * - Backtick interpolated strings `` `value={x}` ``
 */

interface Token {
  type: 'ws' | 'comment' | 'string' | 'number' | 'ident' | 'punct';
  value: string;
  line: number;
}

const COMPOUND_OPS = new Set(['+=', '-=', '*=', '/=', '%=', '..=']);
const LUA_KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return',
  'then', 'true', 'until', 'while',
]);

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  const n = src.length;

  const readLongBracket = (startIdx: number): { text: string; end: number; lines: number } | null => {
    if (src[startIdx] !== '[') return null;
    let eq = 0;
    let j = startIdx + 1;
    while (j < n && src[j] === '=') {
      eq++;
      j++;
    }
    if (j >= n || src[j] !== '[') return null;
    const close = ']' + '='.repeat(eq) + ']';
    const closeIdx = src.indexOf(close, j + 1);
    const end = closeIdx === -1 ? n : closeIdx + close.length;
    const text = src.slice(startIdx, end);
    const lines = (text.match(/\n/g) || []).length;
    return { text, end, lines };
  };

  while (i < n) {
    const ch = src[i];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      let j = i;
      while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\r' || src[j] === '\n')) {
        if (src[j] === '\n') line++;
        j++;
      }
      tokens.push({ type: 'ws', value: src.slice(i, j), line });
      i = j;
      continue;
    }

    // Comments
    if (ch === '-' && src[i + 1] === '-') {
      const startLine = line;
      const lb = readLongBracket(i + 2);
      if (lb) {
        tokens.push({ type: 'comment', value: '--' + lb.text, line: startLine });
        line += lb.lines;
        i = lb.end;
      } else {
        let j = i + 2;
        while (j < n && src[j] !== '\n') j++;
        tokens.push({ type: 'comment', value: src.slice(i, j), line: startLine });
        i = j;
      }
      continue;
    }

    // Long string [[ ... ]]
    if (ch === '[' && (src[i + 1] === '[' || src[i + 1] === '=')) {
      const lb = readLongBracket(i);
      if (lb) {
        tokens.push({ type: 'string', value: lb.text, line });
        line += lb.lines;
        i = lb.end;
        continue;
      }
    }

    // Quoted strings "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startLine = line;
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') {
          if (src[j + 1] === '\n') line++;
          j += 2;
          continue;
        }
        if (src[j] === '\n') line++;
        if (src[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ type: 'string', value: src.slice(i, j), line: startLine });
      i = j;
      continue;
    }

    // Backtick interpolated strings `...{expr}...`
    if (ch === '`') {
      const startLine = line;
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') {
          j += 2;
          continue;
        }
        if (src[j] === '\n') line++;
        if (src[j] === '`') {
          j++;
          break;
        }
        j++;
      }
      const raw = src.slice(i + 1, j - (src[j - 1] === '`' ? 1 : 0));
      tokens.push({ type: 'string', value: convertBacktickString(raw), line: startLine });
      i = j;
      continue;
    }

    // Numbers
    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < n && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      let j = i;
      if (ch === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X' || src[i + 1] === 'b' || src[i + 1] === 'B')) {
        j += 2;
        while (j < n && /[0-9a-fA-F_]/.test(src[j])) j++;
      } else {
        while (j < n && /[0-9._]/.test(src[j])) j++;
        if (j < n && (src[j] === 'e' || src[j] === 'E')) {
          j++;
          if (j < n && (src[j] === '+' || src[j] === '-')) j++;
          while (j < n && /[0-9_]/.test(src[j])) j++;
        }
      }
      const numVal = src.slice(i, j).replace(/_/g, '');
      tokens.push({ type: 'number', value: numVal, line });
      i = j;
      continue;
    }

    // Identifiers & keywords
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let j = i + 1;
      while (j < n && ((src[j] >= 'a' && src[j] <= 'z') || (src[j] >= 'A' && src[j] <= 'Z') || (src[j] >= '0' && src[j] <= '9') || src[j] === '_')) {
        j++;
      }
      tokens.push({ type: 'ident', value: src.slice(i, j), line });
      i = j;
      continue;
    }

    // Multi-char punctuation
    const three = src.slice(i, i + 3);
    if (three === '..=' || three === '...') {
      tokens.push({ type: 'punct', value: three, line });
      i += 3;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (
      two === '+=' || two === '-=' || two === '*=' || two === '/=' || two === '%=' ||
      two === '==' || two === '~=' || two === '<=' || two === '>=' ||
      two === '..' || two === '::' || two === '->'
    ) {
      tokens.push({ type: 'punct', value: two, line });
      i += 2;
      continue;
    }

    tokens.push({ type: 'punct', value: ch, line });
    i++;
  }

  return tokens;
}

function convertBacktickString(raw: string): string {
  const parts: string[] = [];
  let buf = '';
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === '\\' && i + 1 < raw.length) {
      buf += raw[i + 1];
      i += 2;
      continue;
    }
    if (raw[i] === '{') {
      if (buf.length > 0) {
        parts.push(JSON.stringify(buf));
        buf = '';
      }
      let depth = 1;
      let j = i + 1;
      while (j < raw.length && depth > 0) {
        if (raw[j] === '{') depth++;
        else if (raw[j] === '}') depth--;
        j++;
      }
      const inner = raw.slice(i + 1, depth === 0 ? j - 1 : j).trim();
      if (inner.length > 0) {
        parts.push(`tostring(${transpileLuauToLua(inner)})`);
      }
      i = j;
      continue;
    }
    buf += raw[i];
    i++;
  }
  if (buf.length > 0 || parts.length === 0) {
    parts.push(JSON.stringify(buf));
  }
  return parts.length === 1 ? parts[0] : `(${parts.join(' .. ')})`;
}

function isTrivia(t: Token): boolean {
  return t.type === 'ws' || t.type === 'comment';
}

function nextSigIdx(tokens: Token[], idx: number): number {
  let j = idx + 1;
  while (j < tokens.length && isTrivia(tokens[j])) j++;
  return j < tokens.length ? j : -1;
}

function prevSigIdx(tokens: Token[], idx: number): number {
  let j = idx - 1;
  while (j >= 0 && isTrivia(tokens[j])) j--;
  return j >= 0 ? j : -1;
}

/** Skips a Luau type expression starting at `idx`, returning the index of the first token AFTER the type. */
function skipTypeExpression(tokens: Token[], startIdx: number): number {
  let i = startIdx;
  let parenDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;
  let bracketDepth = 0;
  let consumedAny = false;
  let lastSig: Token | null = null;

  while (i < tokens.length) {
    const t = tokens[i];
    if (isTrivia(t)) {
      i++;
      continue;
    }

    if (t.value === '(') {
      // Only enter `(` as part of a type if at start of type or after `->`, `|`, `&`, `<`, `,`, or `typeof`
      if (
        consumedAny &&
        parenDepth === 0 &&
        braceDepth === 0 &&
        angleDepth === 0 &&
        bracketDepth === 0 &&
        lastSig &&
        lastSig.value !== '->' &&
        lastSig.value !== '|' &&
        lastSig.value !== '&' &&
        lastSig.value !== 'typeof'
      ) {
        break;
      }
      parenDepth++;
      consumedAny = true;
      lastSig = t;
      i++;
      continue;
    }
    if (t.value === ')') {
      if (parenDepth > 0) {
        parenDepth--;
        lastSig = t;
        i++;
        continue;
      }
      break;
    }
    if (t.value === '{') {
      if (
        consumedAny &&
        parenDepth === 0 &&
        braceDepth === 0 &&
        angleDepth === 0 &&
        bracketDepth === 0 &&
        lastSig &&
        lastSig.value !== '|' &&
        lastSig.value !== '&' &&
        lastSig.value !== '->'
      ) {
        break;
      }
      braceDepth++;
      consumedAny = true;
      lastSig = t;
      i++;
      continue;
    }
    if (t.value === '}') {
      if (braceDepth > 0) {
        braceDepth--;
        lastSig = t;
        i++;
        continue;
      }
      break;
    }
    if (t.value === '<') {
      angleDepth++;
      consumedAny = true;
      lastSig = t;
      i++;
      continue;
    }
    if (t.value === '>') {
      if (angleDepth > 0) {
        angleDepth--;
        lastSig = t;
        i++;
        continue;
      }
      break;
    }
    if (t.value === '[') {
      bracketDepth++;
      consumedAny = true;
      lastSig = t;
      i++;
      continue;
    }
    if (t.value === ']') {
      if (bracketDepth > 0) {
        bracketDepth--;
        lastSig = t;
        i++;
        continue;
      }
      break;
    }

    if (parenDepth === 0 && braceDepth === 0 && angleDepth === 0 && bracketDepth === 0) {
      if (
        t.value === '=' ||
        t.value === ',' ||
        t.value === ';' ||
        t.value === 'in' ||
        t.value === 'do' ||
        t.value === 'then' ||
        (t.type === 'ident' &&
          LUA_KEYWORDS.has(t.value) &&
          t.value !== 'nil' &&
          t.value !== 'true' &&
          t.value !== 'false')
      ) {
        break;
      }
      if (
        consumedAny &&
        lastSig &&
        lastSig.value !== '|' &&
        lastSig.value !== '&' &&
        lastSig.value !== '->' &&
        lastSig.value !== '.' &&
        lastSig.value !== '?' &&
        t.value !== '|' &&
        t.value !== '&' &&
        t.value !== '->' &&
        t.value !== '.' &&
        t.value !== '?'
      ) {
        break;
      }
    }

    consumedAny = true;
    lastSig = t;
    i++;
  }
  return i;
}

/** Pass 1: Strip `type Name = ...`, `export type Name = ...`, `:: Type`, and `: Type` annotations. */
function stripTypeSyntax(tokens: Token[]): Token[] {
  const out: Token[] = [];
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];

    // Strip `export type Foo = ...` or top-level `type Foo = ...`
    if (t.type === 'ident' && (t.value === 'export' || t.value === 'type')) {
      const prev = prevSigIdx(tokens, i);
      const atStatementStart =
        prev === -1 ||
        tokens[prev].value === ';' ||
        tokens[prev].line < t.line ||
        ['do', 'then', 'else', 'repeat'].includes(tokens[prev].value);

      if (atStatementStart) {
        let typeKwIdx = -1;
        if (t.value === 'type') {
          typeKwIdx = i;
        } else {
          const n1 = nextSigIdx(tokens, i);
          if (n1 >= 0 && tokens[n1].type === 'ident' && tokens[n1].value === 'type') {
            typeKwIdx = n1;
          }
        }
        if (typeKwIdx >= 0) {
          const nameIdx = nextSigIdx(tokens, typeKwIdx);
          if (nameIdx >= 0 && tokens[nameIdx].type === 'ident') {
            // Confirm `=` appears before newline/statement end
            let scan = nextSigIdx(tokens, nameIdx);
            if (scan >= 0 && tokens[scan].value === '<') {
              let d = 1;
              scan++;
              while (scan < tokens.length && d > 0) {
                if (tokens[scan].value === '<') d++;
                else if (tokens[scan].value === '>') d--;
                scan++;
              }
              while (scan < tokens.length && isTrivia(tokens[scan])) scan++;
            }
            if (scan >= 0 && tokens[scan].value === '=') {
              const afterType = skipTypeExpression(tokens, scan + 1);
              i = afterType;
              continue;
            }
          }
        }
      }
    }

    // Strip `:: Type` type cast
    if (t.type === 'punct' && t.value === '::') {
      const afterType = skipTypeExpression(tokens, i + 1);
      i = afterType;
      continue;
    }

    // Strip parameter/local/return `: Type` annotations, preserving method calls `obj:Method(` or `expr():Method(`
    if (t.type === 'punct' && t.value === ':') {
      const prev = prevSigIdx(tokens, i);
      const next = nextSigIdx(tokens, i);
      const prevIsCloseParen = prev >= 0 && tokens[prev].value === ')';
      const nextAfterName = next >= 0 ? nextSigIdx(tokens, next) : -1;
      const isMethodCall =
        next >= 0 &&
        tokens[next].type === 'ident' &&
        nextAfterName >= 0 &&
        tokens[nextAfterName].line === tokens[next].line &&
        (tokens[nextAfterName].value === '(' ||
          tokens[nextAfterName].value === '{' ||
          tokens[nextAfterName].type === 'string');

      if (!isMethodCall) {
        const isParamOrReturnOrLocal =
          prevIsCloseParen ||
          (prev >= 0 && tokens[prev].type === 'ident');
        if (isParamOrReturnOrLocal) {
          const afterType = skipTypeExpression(tokens, i + 1);
          i = afterType;
          continue;
        }
      }
    }

    out.push(t);
    i++;
  }

  return out;
}

/** Pass 2: Rewrite inline `if cond then expr else expr` expressions and compound assignments. */
function rewriteInlineIfAndCompound(tokens: Token[]): Token[] {
  const out: Token[] = [];
  let i = 0;

  const isExpressionContextBeforeIf = (idx: number): boolean => {
    const prev = prevSigIdx(tokens, idx);
    if (prev === -1) return false;
    const pv = tokens[prev].value;
    return (
      pv === '=' ||
      pv === 'return' ||
      pv === '(' ||
      pv === '[' ||
      pv === '{' ||
      pv === ',' ||
      pv === '..' ||
      pv === 'and' ||
      pv === 'or' ||
      pv === '+' ||
      pv === '-' ||
      pv === '*' ||
      pv === '/' ||
      pv === '%' ||
      pv === '==' ||
      pv === '~=' ||
      pv === '<' ||
      pv === '>' ||
      pv === '<=' ||
      pv === '>='
    );
  };

  while (i < tokens.length) {
    const t = tokens[i];

    // Rewrite inline expression `if cond then a [elseif cond2 then b]* else c`
    if (t.type === 'ident' && t.value === 'if' && isExpressionContextBeforeIf(i)) {
      const converted = tryParseInlineIf(tokens, i);
      if (converted) {
        out.push({ type: 'ident', value: converted.luaCode, line: t.line });
        i = converted.nextIdx;
        continue;
      }
    }

    // Rewrite compound assignments `lhs += rhs` -> `lhs = lhs + (rhs)`
    if (t.type === 'punct' && COMPOUND_OPS.has(t.value)) {
      const op = t.value.slice(0, -1); // '+', '-', '*', '/', '%', '..'
      // Walk back in `out` to capture the lvalue expression
      let lhsEnd = out.length - 1;
      while (lhsEnd >= 0 && out[lhsEnd].type === 'ws') lhsEnd--;

      let paren = 0;
      let bracket = 0;
      let k = lhsEnd;
      while (k >= 0) {
        const tk = out[k];
        if (tk.value === ')') paren++;
        else if (tk.value === '(') {
          if (paren === 0) break;
          paren--;
        } else if (tk.value === ']') bracket++;
        else if (tk.value === '[') {
          if (bracket === 0) break;
          bracket--;
        } else if (paren === 0 && bracket === 0) {
          if (tk.type === 'ws' || tk.type === 'comment') {
            const p = prevSigIdx(out, k);
            if (p >= 0 && out[p].value !== '.' && out[p].value !== ':') {
              // Check next non-ws token after k
              const n = nextSigIdx(out, k);
              if (n >= 0 && out[n].value !== '.' && out[n].value !== '[' && out[n].value !== '(') {
                break;
              }
            }
          } else if (
            tk.value === ';' ||
            tk.value === '=' ||
            tk.value === ',' ||
            (tk.type === 'ident' && LUA_KEYWORDS.has(tk.value))
          ) {
            break;
          }
        }
        k--;
      }
      const lhsStart = k + 1;
      const lhsStr = out
        .slice(lhsStart, lhsEnd + 1)
        .map((x) => x.value)
        .join('')
        .trim();

      if (lhsStr) {
        // Capture rhs expression until end of statement (newline at depth 0, `;`, `end`, `else`, `elseif`, `until`)
        let r = i + 1;
        let rParen = 0;
        let rBrace = 0;
        let rBracket = 0;
        const rhsTokens: Token[] = [];
        const startLine = t.line;
        while (r < tokens.length) {
          const rt = tokens[r];
          if (rt.value === '(') rParen++;
          else if (rt.value === ')') {
            if (rParen === 0) break;
            rParen--;
          } else if (rt.value === '{') rBrace++;
          else if (rt.value === '}') {
            if (rBrace === 0) break;
            rBrace--;
          } else if (rt.value === '[') rBracket++;
          else if (rt.value === ']') {
            if (rBracket === 0) break;
            rBracket--;
          }

          if (rParen === 0 && rBrace === 0 && rBracket === 0) {
            if (rt.value === ';' || (rt.type === 'ws' && rt.value.includes('\n') && rhsTokens.some((x) => !isTrivia(x)))) {
              break;
            }
            if (rt.type === 'ident' && (rt.value === 'end' || rt.value === 'else' || rt.value === 'elseif' || rt.value === 'until')) {
              break;
            }
            if (rt.line > startLine && rhsTokens.some((x) => !isTrivia(x))) {
              break;
            }
          }
          rhsTokens.push(rt);
          r++;
        }

        const rhsRaw = rhsTokens.map((x) => x.value).join('').trim();
        const rhsTranspiled = transpileLuauToLua(rhsRaw);
        out.push({ type: 'punct', value: ` = ${lhsStr} ${op} (${rhsTranspiled})`, line: t.line });
        i = r;
        continue;
      }
    }

    out.push(t);
    i++;
  }

  return out;
}

function tryParseInlineIf(tokens: Token[], ifIdx: number): { luaCode: string; nextIdx: number } | null {
  // Scan: `if <cond> then <branch> (elseif <cond> then <branch>)* else <branch>`
  let i = ifIdx + 1;
  let blockDepth = 0;
  let parenDepth = 0;
  let braceDepth = 0;

  const collectUntil = (stopWords: Set<string>, allowCommaOrClose: boolean): { text: string; stopWord: string; nextIdx: number } | null => {
    const start = i;
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'punct') {
        if (t.value === '(') parenDepth++;
        else if (t.value === ')') {
          if (parenDepth === 0) {
            if (allowCommaOrClose && blockDepth === 0) {
              return {
                text: tokens.slice(start, i).map((x) => x.value).join('').trim(),
                stopWord: ')',
                nextIdx: i,
              };
            }
            return null;
          }
          parenDepth--;
        } else if (t.value === '{') braceDepth++;
        else if (t.value === '}') {
          if (braceDepth === 0) {
            if (allowCommaOrClose && blockDepth === 0) {
              return {
                text: tokens.slice(start, i).map((x) => x.value).join('').trim(),
                stopWord: '}',
                nextIdx: i,
              };
            }
            return null;
          }
          braceDepth--;
        } else if (t.value === ',' || t.value === ';' || t.value === ']') {
          if (allowCommaOrClose && blockDepth === 0 && parenDepth === 0 && braceDepth === 0) {
            return {
              text: tokens.slice(start, i).map((x) => x.value).join('').trim(),
              stopWord: t.value,
              nextIdx: i,
            };
          }
        }
      } else if (t.type === 'ident' && parenDepth === 0 && braceDepth === 0) {
        if (t.value === 'function' || t.value === 'do' || t.value === 'for' || t.value === 'while') {
          blockDepth++;
        } else if (t.value === 'end') {
          if (blockDepth === 0) {
            if (allowCommaOrClose) {
              return {
                text: tokens.slice(start, i).map((x) => x.value).join('').trim(),
                stopWord: 'end',
                nextIdx: i,
              };
            }
            return null;
          }
          blockDepth--;
        } else if (blockDepth === 0 && stopWords.has(t.value)) {
          return {
            text: tokens.slice(start, i).map((x) => x.value).join('').trim(),
            stopWord: t.value,
            nextIdx: i,
          };
        }
      }
      i++;
    }
    if (allowCommaOrClose && blockDepth === 0 && parenDepth === 0 && braceDepth === 0) {
      return {
        text: tokens.slice(start, i).map((x) => x.value).join('').trim(),
        stopWord: 'EOF',
        nextIdx: i,
      };
    }
    return null;
  };

  const parts: string[] = [];
  const cond1 = collectUntil(new Set(['then']), false);
  if (!cond1 || cond1.stopWord !== 'then') return null;
  i = cond1.nextIdx + 1;
  parts.push(`if ${transpileLuauToLua(cond1.text)} then`);

  while (true) {
    const branch = collectUntil(new Set(['elseif', 'else']), false);
    if (!branch) return null;
    i = branch.nextIdx + 1;
    parts.push(`return (${transpileLuauToLua(branch.text)})`);
    if (branch.stopWord === 'elseif') {
      const nextCond = collectUntil(new Set(['then']), false);
      if (!nextCond || nextCond.stopWord !== 'then') return null;
      i = nextCond.nextIdx + 1;
      parts.push(`elseif ${transpileLuauToLua(nextCond.text)} then`);
    } else {
      parts.push('else');
      break;
    }
  }

  // Else expression runs until same-line end of expr or delimiter `,` / `)` / `}` / `]` / `;` / Lua keyword
  const startElse = i;
  const elseStartLine = tokens[Math.min(i, tokens.length - 1)]?.line ?? 0;
  let seenSig = false;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === 'ws') {
      if (t.value.includes('\n') && seenSig && parenDepth === 0 && braceDepth === 0 && blockDepth === 0) {
        break;
      }
      i++;
      continue;
    }
    if (t.type === 'comment') {
      i++;
      continue;
    }
    seenSig = true;
    if (t.value === '(') parenDepth++;
    else if (t.value === ')') {
      if (parenDepth === 0) break;
      parenDepth--;
    } else if (t.value === '{') braceDepth++;
    else if (t.value === '}') {
      if (braceDepth === 0) break;
      braceDepth--;
    } else if (t.value === '[' && braceDepth === 0) {
      // indexing allowed inside else branch
    } else if (parenDepth === 0 && braceDepth === 0 && blockDepth === 0) {
      if (t.value === ',' || t.value === ';' || t.value === ']') break;
      if (t.type === 'ident' && ['then', 'do', 'end', 'else', 'elseif', 'until'].includes(t.value)) break;
      if (t.line > elseStartLine) {
        const prev = prevSigIdx(tokens, i);
        const pv = prev >= 0 ? tokens[prev].value : '';
        if (!['+', '-', '*', '/', '..', 'and', 'or'].includes(pv)) break;
      }
    }
    i++;
  }

  const elseText = tokens.slice(startElse, i).map((x) => x.value).join('').trim();
  if (!elseText) return null;
  parts.push(`return (${transpileLuauToLua(elseText)}) end`);

  return {
    luaCode: `(function() ${parts.join(' ')} end)()`,
    nextIdx: i,
  };
}

/** Pass 3: Rewrite `continue` statements inside loops to Lua 5.3 `goto __cont_N__` / `::__cont_N__::`. */
function rewriteContinueStatements(tokens: Token[]): Token[] {
  const loopStack: { label: string; used: boolean; endKind: 'end' | 'until' }[] = [];
  const blockStack: ('loop' | 'other')[] = [];
  let labelCounter = 1;
  const out: Token[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'ident') {
      if (t.value === 'for' || t.value === 'while') {
        const label = `__sf_cont_${labelCounter++}__`;
        loopStack.push({ label, used: false, endKind: 'end' });
        blockStack.push('loop');
        out.push(t);
        continue;
      }
      if (t.value === 'repeat') {
        const label = `__sf_cont_${labelCounter++}__`;
        loopStack.push({ label, used: false, endKind: 'until' });
        blockStack.push('loop');
        out.push(t);
        continue;
      }
      if (t.value === 'if' || t.value === 'function') {
        blockStack.push('other');
        out.push(t);
        continue;
      }
      if (t.value === 'do') {
        // Ignore `for ... do` or `while ... do` since `for`/`while` already pushed a block
        // Only standalone `do ... end` pushes 'other'
        // Check backward to see if matching a `for` or `while` before newline/end
        let k = i - 1;
        let belongsToLoop = false;
        while (k >= 0) {
          const prev = tokens[k];
          if (prev.type === 'ident' && (prev.value === 'for' || prev.value === 'while')) {
            belongsToLoop = true;
            break;
          }
          if (prev.type === 'ident' && ['do', 'then', 'end', 'until', 'function', 'repeat'].includes(prev.value)) {
            break;
          }
          if (prev.value === ';') break;
          k--;
        }
        if (!belongsToLoop) {
          blockStack.push('other');
        }
        out.push(t);
        continue;
      }
      if (t.value === 'continue' && loopStack.length > 0) {
        const prev = prevSigIdx(tokens, i);
        const isProp = prev >= 0 && (tokens[prev].value === '.' || tokens[prev].value === ':');
        if (!isProp) {
          const topLoop = loopStack[loopStack.length - 1];
          topLoop.used = true;
          out.push({ type: 'ident', value: `goto ${topLoop.label}`, line: t.line });
          continue;
        }
      }
      if (t.value === 'until' && blockStack.length > 0) {
        const popped = blockStack.pop();
        if (popped === 'loop' && loopStack.length > 0) {
          const loop = loopStack.pop()!;
          if (loop.used) {
            out.push({ type: 'ident', value: `::${loop.label}:: `, line: t.line });
          }
        }
        out.push(t);
        continue;
      }
      if (t.value === 'end' && blockStack.length > 0) {
        const popped = blockStack.pop();
        if (popped === 'loop' && loopStack.length > 0) {
          const loop = loopStack.pop()!;
          if (loop.used) {
            out.push({ type: 'ident', value: `::${loop.label}:: `, line: t.line });
          }
        }
        out.push(t);
        continue;
      }
    }
    out.push(t);
  }

  return out;
}

export function transpileLuauToLua(source: string): string {
  const initialTokens = tokenize(source);
  const noTypes = stripTypeSyntax(initialTokens);
  const reEvaluated = tokenize(noTypes.map((t) => t.value).join(''));
  const rewroteExprs = rewriteInlineIfAndCompound(reEvaluated);
  const reTokenized = tokenize(rewroteExprs.map((t) => t.value).join(''));
  const finalTokens = rewriteContinueStatements(reTokenized);
  return finalTokens.map((t) => t.value).join('');
}
