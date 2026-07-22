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
          if (numStr === "-") return null;
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

    const outputQueue: string[] = [];
    const operatorStack: string[] = [];

    for (const token of tokens) {
      if (!isNaN(Number(token))) {
        outputQueue.push(token);
      } else if (token in precedence) {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== "(" &&
          (precedence[operatorStack[operatorStack.length - 1]] > precedence[token] ||
            (precedence[operatorStack[operatorStack.length - 1]] === precedence[token] && token !== "^"))
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        operatorStack.push(token);
      } else if (token === "(") {
        operatorStack.push(token);
      } else if (token === ")") {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== "("
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        if (
          operatorStack.length === 0 ||
          operatorStack[operatorStack.length - 1] !== "("
        ) {
          return null; // Mismatched parenthesis
        }
        operatorStack.pop();
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop()!;
      if (op === "(" || op === ")") return null;
      outputQueue.push(op);
    }

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
