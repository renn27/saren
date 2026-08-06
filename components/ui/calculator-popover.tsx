"use client";

import * as React from "react";
import { X, Check, Delete, Calculator } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CalculatorPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (calculatedValue: number) => void;
  initialValue?: number | string | null;
  title?: string;
}

export function CalculatorPopover({
  isOpen,
  onClose,
  onApply,
  initialValue = 0,
  title = "Kalkulator",
}: CalculatorPopoverProps) {
  const [expression, setExpression] = React.useState("");
  const [displayValue, setDisplayValue] = React.useState("0");

  // Initialize display when opened
  React.useEffect(() => {
    if (isOpen) {
      const num = Number(initialValue) || 0;
      setDisplayValue(String(num));
      setExpression(num > 0 ? String(num) : "");
    }
  }, [isOpen, initialValue]);

  // Safely evaluate simple math expressions (+, -, *, /, %)
  const evaluateExpression = (expr: string): number => {
    try {
      if (!expr.trim()) return 0;
      // Clean string, replace × with * and ÷ with /
      const cleanExpr = expr.replace(/×/g, "*").replace(/÷/g, "/");
      // Sanitize: only allow numbers, operators, dots, parentheses
      if (/[^0-9+\-*/.()%\s]/.test(cleanExpr)) return 0;
      
      // Handle % by replacing N% with (N/100)
      const pctExpr = cleanExpr.replace(/(\d+(\.\d+)?)%/g, "($1/100)");

      // Use Function constructor instead of raw eval for safe evaluation
      const result = new Function(`return (${pctExpr})`)();
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        return Math.round(result * 100) / 100; // Round to 2 decimal places max
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const handleDigit = (digit: string) => {
    setExpression((prev) => {
      // If previous display was just 0 or error, start fresh
      if (prev === "0") return digit;
      return prev + digit;
    });
  };

  const handleOperator = (op: string) => {
    setExpression((prev) => {
      if (!prev) return displayValue + " " + op + " ";
      const trimmed = prev.trim();
      const lastChar = trimmed.slice(-1);
      if (["+", "-", "*", "/", "×", "÷"].includes(lastChar)) {
        return trimmed.slice(0, -1) + op + " ";
      }
      return prev + " " + op + " ";
    });
  };

  const handleClear = () => {
    setExpression("");
    setDisplayValue("0");
  };

  const handleBackspace = () => {
    setExpression((prev) => {
      if (!prev || prev.length <= 1) return "";
      if (prev.endsWith(" ")) return prev.slice(0, -3);
      return prev.slice(0, -1);
    });
  };

  // Recalculate preview on expression change
  React.useEffect(() => {
    if (!expression.trim()) {
      const num = Number(initialValue) || 0;
      setDisplayValue(String(num));
      return;
    }
    const res = evaluateExpression(expression);
    setDisplayValue(String(res));
  }, [expression, initialValue]);

  const handleEqual = () => {
    const res = evaluateExpression(expression);
    setDisplayValue(String(res));
    setExpression(String(res));
  };

  const handleApplyClick = () => {
    const finalVal = evaluateExpression(expression || displayValue);
    onApply(finalVal);
    onClose();
  };

  const formattedDisplay = React.useMemo(() => {
    const num = Number(displayValue);
    if (isNaN(num)) return displayValue;
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(num);
  }, [displayValue]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      hideHeader={true}
      maxWidthClassName="max-w-[340px]"
      contentClassName="p-3.5 sm:p-4"
    >
      <div className="flex flex-col gap-2.5 w-full select-none">
        {/* Header Title with Calculator Icon */}
        <div className="flex items-center justify-between pb-1.5 border-b border-border-soft/60 pr-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <Calculator className="h-4 w-4" />
            </div>
            <span className="font-semibold text-xs text-text-primary font-display truncate max-w-[210px]">
              {title}
            </span>
          </div>
        </div>

        {/* Display Screen Box */}
        <div className="flex flex-col items-end justify-center bg-bg-page border border-border-soft/80 px-3.5 py-2.5 rounded-2xl min-h-[64px] overflow-hidden">
          <span className="text-[11px] text-text-secondary font-mono h-4 overflow-hidden text-ellipsis whitespace-nowrap w-full text-right">
            {expression || "0"}
          </span>
          <span className="text-2xl font-bold font-mono text-accent tracking-tight h-8 flex items-center justify-end w-full overflow-hidden text-ellipsis">
            {formattedDisplay}
          </span>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="h-11 rounded-xl bg-danger-soft text-danger font-semibold text-xs active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-danger/20"
          >
            C
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-bg-page text-text-secondary hover:text-text-primary font-semibold text-xs active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60"
            title="Hapus"
          >
            <Delete className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOperator("%")}
            className="h-11 rounded-xl bg-bg-page text-text-secondary hover:text-text-primary font-semibold text-xs active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleOperator("÷")}
            className="h-11 rounded-xl bg-accent-soft text-accent font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-accent/20"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleDigit("7")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleDigit("8")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleDigit("9")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleOperator("×")}
            className="h-11 rounded-xl bg-accent-soft text-accent font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-accent/20"
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleDigit("4")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleDigit("5")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleDigit("6")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleOperator("-")}
            className="h-11 rounded-xl bg-accent-soft text-accent font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-accent/20"
          >
            -
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleDigit("1")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleDigit("2")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleDigit("3")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleOperator("+")}
            className="h-11 rounded-xl bg-accent-soft text-accent font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-accent/20"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleDigit("000")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-[11px] active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            000
          </button>
          <button
            type="button"
            onClick={() => handleDigit(".")}
            className="h-11 rounded-xl bg-bg-surface text-text-primary font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer border border-border-soft/60 hover:bg-bg-page"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEqual}
            className="h-11 rounded-xl bg-accent text-white font-bold text-sm active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer shadow-2xs"
          >
            =
          </button>
        </div>

        {/* Bottom Apply Action */}
        <div className="flex items-center gap-2 pt-2 border-t border-border-soft/60 mt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApplyClick}
            className="flex-1 h-10 rounded-xl gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>Terapkan</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
