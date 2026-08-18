/**
 * Helper utility for evaluating dynamic arithmetic formula columns.
 * Supports operators: +, -, *, /, %, ^, (, )
 * Column references can be written as:
 * - Direct names: `8 - limit`
 * - Bracketed names: `8 - [limit]` or `{limit}`
 */

export interface FormulaColumnRef {
  id: string;
  namaKolom: string;
  tipeKolom: string;
  rumus?: string | null;
  isTarget?: boolean;
  nilaiTarget?: string | null;
}

// ── LRU Token Cache for AST & Tokenized expressions ─────────────────────────
const tokenCache = new Map<string, string[] | null>();
const MAX_CACHE_SIZE = 500;

/**
 * Evaluates pure mathematical arithmetic string safely.
 * Returns calculated number or null if invalid expression.
 */
export function evaluateMathExpression(expr: string): number | null {
  const sanitized = expr.replace(/\s+/g, "");
  if (!sanitized) return null;

  // Only allow valid numeric and arithmetic characters
  if (!/^[0-9.\+\-\*\/\%\^\(\)]+$/.test(sanitized)) {
    return null;
  }

  try {
    let outputQueue: string[] | null = null;

    if (tokenCache.has(sanitized)) {
      outputQueue = tokenCache.get(sanitized)!;
      if (!outputQueue) return null;
    } else {
      const tokens: string[] = [];
      let i = 0;
      while (i < sanitized.length) {
        const char = sanitized[i];

        if ("+-*/%^()".includes(char)) {
          // Handle unary minus: e.g. "-5" or "(-5"
          if (
            char === "-" &&
            (i === 0 || "+-*/%^(".includes(sanitized[i - 1]))
          ) {
            let numStr = "-";
            i++;
            while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
              numStr += sanitized[i];
              i++;
            }
            if (numStr === "-") {
              tokenCache.set(sanitized, null);
              return null;
            }
            tokens.push(numStr);
            continue;
          }
          tokens.push(char);
          i++;
        } else if (/[0-9.]/.test(char)) {
          let numStr = "";
          while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
            numStr += sanitized[i];
            i++;
          }
          tokens.push(numStr);
        } else {
          tokenCache.set(sanitized, null);
          return null;
        }
      }

      const precedence: Record<string, number> = {
        "+": 1,
        "-": 1,
        "*": 2,
        "/": 2,
        "%": 2,
        "^": 3,
      };

      const parsedQueue: string[] = [];
      const operatorStack: string[] = [];

      for (const token of tokens) {
        if (!isNaN(Number(token))) {
          parsedQueue.push(token);
        } else if (token in precedence) {
          while (
            operatorStack.length > 0 &&
            operatorStack[operatorStack.length - 1] !== "(" &&
            (precedence[operatorStack[operatorStack.length - 1]] > precedence[token] ||
              (precedence[operatorStack[operatorStack.length - 1]] === precedence[token] && token !== "^"))
          ) {
            parsedQueue.push(operatorStack.pop()!);
          }
          operatorStack.push(token);
        } else if (token === "(") {
          operatorStack.push(token);
        } else if (token === ")") {
          while (
            operatorStack.length > 0 &&
            operatorStack[operatorStack.length - 1] !== "("
          ) {
            parsedQueue.push(operatorStack.pop()!);
          }
          if (
            operatorStack.length === 0 ||
            operatorStack[operatorStack.length - 1] !== "("
          ) {
            tokenCache.set(sanitized, null);
            return null; // Mismatched parenthesis
          }
          operatorStack.pop();
        }
      }

      while (operatorStack.length > 0) {
        const op = operatorStack.pop()!;
        if (op === "(" || op === ")") {
          tokenCache.set(sanitized, null);
          return null;
        }
        parsedQueue.push(op);
      }

      if (tokenCache.size >= MAX_CACHE_SIZE) {
        tokenCache.clear();
      }
      tokenCache.set(sanitized, parsedQueue);
      outputQueue = parsedQueue;
    }

    if (!outputQueue) return null;

    const stack: number[] = [];
    for (const token of outputQueue) {
      if (!isNaN(Number(token))) {
        stack.push(Number(token));
      } else {
        if (stack.length < 2) return null;
        const b = stack.pop()!;
        const a = stack.pop()!;
        let res = 0;
        switch (token) {
          case "+":
            res = a + b;
            break;
          case "-":
            res = a - b;
            break;
          case "*":
            res = a * b;
            break;
          case "/":
            if (b === 0) return 0; // Prevent division by zero crash
            res = a / b;
            break;
          case "%":
            res = a % b;
            break;
          case "^":
            res = Math.pow(a, b);
            break;
        }
        stack.push(res);
      }
    }

    if (stack.length !== 1) return null;
    const finalVal = stack[0];
    return isFinite(finalVal) ? finalVal : 0;
  } catch {
    return null;
  }
}

/**
 * Evaluates a formula for a given row (`customValues`), resolving column names to values.
 */
export function evaluateFormula(
  rumusStr: string | null | undefined,
  customValues: Record<string, any> | undefined | null,
  columns: FormulaColumnRef[],
  visitedColIds: Set<string> = new Set()
): number | null {
  if (!rumusStr || !rumusStr.trim()) return null;

  let replacedFormula = rumusStr.trim();
  const safeCustomValues = customValues || {};

  // Sort columns by name length descending to avoid partial replacements
  // e.g., "Limit Harian" before "Limit"
  const sortedColumns = [...columns].sort(
    (a, b) => b.namaKolom.length - a.namaKolom.length
  );

  for (const col of sortedColumns) {
    if (!col.namaKolom) continue;

    // Determine target numeric value of referenced column
    let targetVal = 0;
    if (col.nilaiTarget !== undefined && col.nilaiTarget !== null && col.nilaiTarget !== "") {
      const numTarget = Number(col.nilaiTarget);
      targetVal = isNaN(numTarget) ? 0 : numTarget;
    }

    // Determine value of referenced column
    let colNumericVal = 0;
    if (col.tipeKolom === "RUMUS") {
      // Guard against recursive / cyclic references
      if (visitedColIds.has(col.id)) {
        colNumericVal = 0;
      } else {
        const nextVisited = new Set(visitedColIds);
        nextVisited.add(col.id);
        const subVal = evaluateFormula(col.rumus, safeCustomValues, columns, nextVisited);
        colNumericVal = subVal ?? 0;
      }
    } else {
      const rawVal = safeCustomValues[col.id];
      if (rawVal !== undefined && rawVal !== null && rawVal !== "") {
        const numVal = Number(rawVal);
        colNumericVal = isNaN(numVal) ? 0 : numVal;
      } else {
        colNumericVal = 0;
      }
    }

    // Escape regex special chars in column name
    const escapedName = col.namaKolom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 1. Replace target references: target [namaKolom], target {namaKolom}, [target namaKolom], target namaKolom, target_namaKolom
    const targetBracketRegex = new RegExp(
      `(?:\\[target\\s+${escapedName}\\]|\\{target\\s+${escapedName}\\}|target\\s*\\[${escapedName}\\]|target\\s*\\{${escapedName}\\})`,
      "gi"
    );
    replacedFormula = replacedFormula.replace(targetBracketRegex, `(${targetVal})`);

    const targetPlainRegex = new RegExp(
      `(?<![a-zA-Z0-9_\\[\\{])target[\\s_\\.]*${escapedName}(?![a-zA-Z0-9_\\]\\}])`,
      "gi"
    );
    replacedFormula = replacedFormula.replace(targetPlainRegex, `(${targetVal})`);

    // 2. Replace column value references: [namaKolom], {namaKolom}
    const bracketRegex = new RegExp(
      `(?:\\[${escapedName}\\]|\\{${escapedName}\\})`,
      "gi"
    );
    replacedFormula = replacedFormula.replace(bracketRegex, `(${colNumericVal})`);

    // Replace unbracketed word variations if not surrounded by brackets or alpha chars
    const plainRegex = new RegExp(
      `(?<![a-zA-Z0-9_\\[\\{])${escapedName}(?![a-zA-Z0-9_\\]\\}])`,
      "gi"
    );
    replacedFormula = replacedFormula.replace(plainRegex, `(${colNumericVal})`);
  }

  return evaluateMathExpression(replacedFormula);
}

/**
 * Checks whether ALL accounts in an application have completed 100% of their target
 * OR have all checkbox (CENTANG) columns checked.
 * Returns true if target columns or CENTANG columns exist, accounts exist, and ALL accounts meet the completion criteria.
 */
export function checkAppTargetCompleted(app: {
  kolom?: any[];
  akun?: any[];
}): boolean {
  if (!app.kolom || !app.akun || app.kolom.length === 0 || app.akun.length === 0) return false;

  const targetCols = app.kolom.filter((c) => c.isTarget && c.nilaiTarget !== null && c.nilaiTarget !== "");
  const centangCols = app.kolom.filter((c) => c.tipeKolom === "CENTANG");

  if (targetCols.length === 0 && centangCols.length === 0) return false;

  // 1. Periksa kolom target spesifik (jika ada)
  const targetCompleted = targetCols.length > 0 && app.akun.every((acc) => {
    const customVals = (acc.customValues || {}) as Record<string, any>;
    return targetCols.every((col) => {
      if (col.tipeKolom === "RUMUS") {
        const calcVal = evaluateFormula(col.rumus, customVals, app.kolom || []);
        if (calcVal === null) return false;
        return calcVal >= Number(col.nilaiTarget);
      }

      const val = customVals[col.id];
      if (val === undefined || val === null || val === "") return false;

      if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
        return Number(val) >= Number(col.nilaiTarget);
      } else if (col.tipeKolom === "CENTANG") {
        const expected = col.nilaiTarget === "true";
        return Boolean(val) === expected;
      } else {
        return String(val).trim().toLowerCase() === String(col.nilaiTarget).trim().toLowerCase();
      }
    });
  });

  // 2. Periksa kolom centang (DONE / checklist columns)
  const centangCompleted = centangCols.length > 0 && app.akun.every((acc) => {
    const customVals = (acc.customValues || {}) as Record<string, any>;
    return centangCols.every((col) => Boolean(customVals[col.id]) === true);
  });

  if (targetCols.length > 0 && centangCols.length > 0) {
    return targetCompleted || centangCompleted;
  }
  if (targetCols.length > 0) return targetCompleted;
  if (centangCols.length > 0) return centangCompleted;

  return false;
}

/**
 * Parses a table cell string into a numeric value.
 * Supports Indonesian format (25,6612 or 1.000,50) and international format (25.6612).
 */
export function parseNoteTableCellNumber(val: string | null | undefined): number {
  if (!val) return 0;
  let s = String(val).replace(/Rp\s*/gi, "").trim();
  if (!s || s === "-" || s === "null" || s === "undefined") return 0;

  // If contains both '.' and ',' (e.g. 1.250.000,50 or 1,250.50)
  if (s.includes(".") && s.includes(",")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // Indonesian format: 1.250.000,50 -> 1250000.50
      const normalized = s.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(normalized);
      return isNaN(n) ? 0 : n;
    } else {
      // US format: 1,250,000.50 -> 1250000.50
      const normalized = s.replace(/,/g, "");
      const n = parseFloat(normalized);
      return isNaN(n) ? 0 : n;
    }
  }

  // If only comma exists (e.g. 25,6612)
  if (s.includes(",")) {
    const normalized = s.replace(",", ".");
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }

  // If only dot or plain number (e.g. 25.6612 or 1000)
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Formats a calculated numeric formula result for Note Table display.
 * Uses Indonesian decimal separator (comma) and cleans unnecessary trailing decimals.
 */
export function formatTableFormulaResult(num: number | null | undefined, customFormula?: string): string {
  if (num === null || num === undefined || isNaN(num) || !isFinite(num)) return "-";
  
  const isPercentage = customFormula ? /persen|%|growth/i.test(customFormula) : false;

  // Format with Indonesian locale (comma for decimal)
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }).format(num);

  if (isPercentage && !formatted.endsWith("%")) {
    return `${formatted}%`;
  }
  return formatted;
}

/**
 * Evaluates a dynamic formula in Note Table for a specific row.
 * Supports:
 * - Current row column references: `[Gram]`, `[Bulan]`, `{Gram}`
 * - Previous row column references: `prev([Gram])`, `prev[Gram]`
 * - Shortcuts: `selisih([Gram])`, `persen([Gram])`, `kumulatif([Gram])`
 * - Standard arithmetic: `+`, `-`, `*`, `/`, `%`, `^`, `(`, `)`
 */
export function evaluateTableNoteFormula(
  formula: string | null | undefined,
  headers: string[],
  rows: string[][],
  rowIndex: number,
  colIndex: number
): number | null {
  if (!formula || !formula.trim() || !headers || !rows || rowIndex < 0 || rowIndex >= rows.length) {
    return null;
  }

  let expr = formula.trim();
  const currentRow = rows[rowIndex] || [];
  const prevRow = rowIndex > 0 ? rows[rowIndex - 1] : null;

  // 1. Expand standard shortcut functions
  // selisih([Col]) -> ([Col] - prev([Col]))
  expr = expr.replace(/selisih\s*\(\s*(\[[^\]]+\]|\{[^\}]+\}|[a-zA-Z0-9_]+)\s*\)/gi, "($1 - prev($1))");
  
  // persen([Col]) or persentase([Col]) or growth([Col]) -> ((([Col] - prev([Col])) / prev([Col])) * 100)
  expr = expr.replace(
    /(?:persen|persentase|growth)\s*\(\s*(\[[^\]]+\]|\{[^\}]+\}|[a-zA-Z0-9_]+)\s*\)/gi,
    "((($1 - prev($1)) / prev($1)) * 100)"
  );

  // 2. Expand kumulatif / cumsum functions: calculate running total up to current row
  // kumulatif([Col])
  const cumsumRegex = /(?:kumulatif|cumsum)\s*\(\s*(\[[^\]]+\]|\{[^\}]+\}|[a-zA-Z0-9_]+)\s*\)/gi;
  expr = expr.replace(cumsumRegex, (_, rawColRef) => {
    const cleanRef = rawColRef.replace(/[\[\]\{\}]/g, "").trim().toLowerCase();
    const targetColIdx = headers.findIndex((h) => h.trim().toLowerCase() === cleanRef);
    if (targetColIdx === -1) return "0";
    let sum = 0;
    for (let r = 0; r <= rowIndex; r++) {
      sum += parseNoteTableCellNumber(rows[r]?.[targetColIdx]);
    }
    return `(${sum})`;
  });

  // Sort headers by length descending to avoid partial replacements
  const headerIndices = headers.map((h, i) => ({ name: h.trim(), idx: i })).filter((h) => h.name.length > 0);
  headerIndices.sort((a, b) => b.name.length - a.name.length);

  for (const { name, idx } of headerIndices) {
    const curVal = parseNoteTableCellNumber(currentRow[idx]);
    // For first row (rowIndex === 0), prevVal is curVal (so delta is 0, percentage is 0)
    const prevVal = prevRow ? parseNoteTableCellNumber(prevRow[idx]) : curVal;

    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Replace prev references: prev([name]), prev{name}, prev[name], prev_name
    const prevBracketRegex = new RegExp(
      `prev\\s*\\(?\\s*(?:\\[${escapedName}\\]|\\{${escapedName}\\}|${escapedName})\\s*\\)?`,
      "gi"
    );
    expr = expr.replace(prevBracketRegex, `(${prevVal})`);

    // Replace current row column references: [name], {name}
    const bracketRegex = new RegExp(`(?:\\[${escapedName}\\]|\\{${escapedName}\\})`, "gi");
    expr = expr.replace(bracketRegex, `(${curVal})`);

    // Replace plain word name if not surrounded by brackets or letters
    const plainRegex = new RegExp(`(?<![a-zA-Z0-9_\\[\\{])${escapedName}(?![a-zA-Z0-9_\\]\\}])`, "gi");
    expr = expr.replace(plainRegex, `(${curVal})`);
  }

  // Handle generic standalone "prev" keyword (e.g. "[Gram] - prev")
  if (/prev/i.test(expr)) {
    // If formula just uses "prev", try to find the first numeric column other than colIndex
    const firstOtherNumericCol = headers.findIndex(
      (_, i) => i !== colIndex && parseNoteTableCellNumber(currentRow[i]) !== 0
    );
    const fallbackCol = firstOtherNumericCol !== -1 ? firstOtherNumericCol : (colIndex > 0 ? colIndex - 1 : 0);
    const prevFallbackVal = prevRow ? parseNoteTableCellNumber(prevRow[fallbackCol]) : parseNoteTableCellNumber(currentRow[fallbackCol]);
    expr = expr.replace(/\bprev\b/gi, `(${prevFallbackVal})`);
  }

  const calculated = evaluateMathExpression(expr);
  if (calculated === null || isNaN(calculated) || !isFinite(calculated)) {
    return 0;
  }
  return calculated;
}
