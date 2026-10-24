import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PowerType = "sph" | "cyl" | "axis" | "add";

interface OpticalPowerInputProps {
  type: PowerType;
  value: string;
  onChange: (val: string) => void;
  cylValue?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function parsePowerValue(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const cleaned = val.replace(/\+/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function cleanAndFormat(type: PowerType, input: string): string {
  if (!input || input.trim() === "") return "";
  const trimmed = input.trim();

  if (type === "sph" || type === "cyl") {
    const num = parseFloat(trimmed.replace(/\+/g, ""));
    if (isNaN(num) || Math.abs(num) < 0.001) return "";
    const rounded = Math.round(num * 4) / 4;
    if (Math.abs(rounded) < 0.001) return "";
    const sign = rounded > 0 ? "+" : "-";
    return `${sign}${Math.abs(rounded).toFixed(2)}`;
  }

  if (type === "add") {
    const num = parseFloat(trimmed.replace(/\+/g, ""));
    if (isNaN(num)) return "";
    let rounded = Math.round(num * 4) / 4;
    if (rounded < 1.00) rounded = 1.00;
    if (rounded > 4.00) rounded = 4.00;
    return `+${rounded.toFixed(2)}`;
  }

  if (type === "axis") {
    const num = parseInt(trimmed.replace(/\+/g, ""), 10);
    if (isNaN(num) || num <= 0) return "";
    let rounded = Math.round(num / 5) * 5;
    if (rounded < 5) return "";
    if (rounded > 180) rounded = 180;
    return rounded.toString();
  }

  return "";
}

export function OpticalPowerInput({
  type,
  value,
  onChange,
  cylValue,
  placeholder,
  id,
  className,
}: OpticalPowerInputProps) {
  const { toast } = useToast();
  const [localValue, setLocalValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startYRef = useRef<number | null>(null);
  const startValueRef = useRef<string>("");
  const isSwipingRef = useRef<boolean>(false);
  const hasTriggeredToastRef = useRef<boolean>(false);

  const isCylEmpty = type === "axis" && (!cylValue || cylValue.trim() === "");

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value || "");
    }
  }, [value, isFocused]);

  const displayValue = isCylEmpty ? "" : (isFocused ? localValue : (value || ""));

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (type === "axis" && isCylEmpty) {
      if (!hasTriggeredToastRef.current) {
        toast({
          title: "CYL Required",
          description: "Please enter CYL value first.",
          duration: 2000,
        });
        hasTriggeredToastRef.current = true;
        setTimeout(() => {
          hasTriggeredToastRef.current = false;
        }, 1500);
      }
      e.preventDefault();
      return;
    }

    startYRef.current = e.clientY;
    startValueRef.current = value || "";
    isSwipingRef.current = false;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    if (startYRef.current === null) return;

    const deltaY = startYRef.current - e.clientY;
    const MOVEMENT_THRESHOLD = 8;
    const STEP_PIXELS = 18;

    if (!isSwipingRef.current) {
      if (Math.abs(deltaY) >= MOVEMENT_THRESHOLD) {
        isSwipingRef.current = true;
        if (document.activeElement === inputRef.current) {
          inputRef.current?.blur();
        }
      }
    }

    if (isSwipingRef.current) {
      const adjustedDelta = deltaY > 0 ? deltaY - MOVEMENT_THRESHOLD : deltaY + MOVEMENT_THRESHOLD;
      const steps = Math.trunc(adjustedDelta / STEP_PIXELS);

      let newVal = "";

      if (type === "sph" || type === "cyl") {
        const startNum = parsePowerValue(startValueRef.current) ?? 0;
        const newNum = startNum + steps * 0.25;
        if (Math.abs(newNum) < 0.001) {
          newVal = "";
        } else {
          const sign = newNum > 0 ? "+" : "";
          newVal = `${sign}${newNum.toFixed(2)}`;
        }
      } else if (type === "add") {
        const isStartEmpty = !startValueRef.current || startValueRef.current.trim() === "";
        const startNum = isStartEmpty ? 1.00 : (parsePowerValue(startValueRef.current) ?? 1.00);
        const newNum = Math.min(4.00, Math.max(1.00, startNum + steps * 0.25));
        newVal = `+${newNum.toFixed(2)}`;
      } else if (type === "axis") {
        const isStartEmpty = !startValueRef.current || startValueRef.current.trim() === "";
        if (isStartEmpty) {
          if (steps > 0) {
            const newNum = Math.min(180, 5 + (steps - 1) * 5);
            newVal = newNum.toString();
          } else if (steps < 0) {
            const newNum = Math.min(180, 5 + (steps + 1) * 5);
            newVal = newNum >= 5 ? newNum.toString() : "";
          } else {
            newVal = "";
          }
        } else {
          const startNum = parseInt(startValueRef.current, 10) || 5;
          const newNum = startNum + steps * 5;
          if (newNum <= 0 || newNum < 5) {
            newVal = "";
          } else {
            newVal = Math.min(180, newNum).toString();
          }
        }
      }

      setLocalValue(newVal);
      onChange(newVal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (startYRef.current !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (isSwipingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }

    startYRef.current = null;
    isSwipingRef.current = false;
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLInputElement>) => {
    if (startYRef.current !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    startYRef.current = null;
    isSwipingRef.current = false;
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (type === "axis" && isCylEmpty) {
      e.target.blur();
      if (!hasTriggeredToastRef.current) {
        toast({
          title: "CYL Required",
          description: "Please enter CYL value first.",
          duration: 2000,
        });
        hasTriggeredToastRef.current = true;
        setTimeout(() => {
          hasTriggeredToastRef.current = false;
        }, 1500);
      }
      return;
    }
    setIsFocused(true);
    setLocalValue(value || "");
  };

  const handleBlur = () => {
    setIsFocused(false);
    const formatted = cleanAndFormat(type, localValue);
    setLocalValue(formatted);
    onChange(formatted);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === "axis" && isCylEmpty) return;
    setLocalValue(e.target.value);
    onChange(e.target.value);
  };

  const inputMode = type === "axis" ? "numeric" : "decimal";

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode={inputMode}
      placeholder={placeholder}
      value={displayValue}
      readOnly={isCylEmpty}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={cn(
        "select-none touch-pan-y",
        isCylEmpty && "cursor-not-allowed opacity-60 bg-muted/20",
        className
      )}
    />
  );
}
