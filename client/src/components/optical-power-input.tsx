import React, { useState, useRef, useEffect, useId } from "react";
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

// Module-level state for tracking active field
let globalActiveFieldId: string | null = null;
const listeners = new Set<() => void>();

export function setActiveFieldId(id: string | null) {
  globalActiveFieldId = id;
  listeners.forEach((fn) => fn());
}

export function useActiveFieldId() {
  const [activeId, setActiveId] = useState<string | null>(globalActiveFieldId);
  useEffect(() => {
    const listener = () => setActiveId(globalActiveFieldId);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return activeId;
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

  if (type === "sph") {
    const num = parseFloat(trimmed.replace(/\+/g, ""));
    if (isNaN(num) || Math.abs(num) < 0.001) return "";
    let rounded = Math.round(num * 4) / 4;
    if (rounded < -30.00) rounded = -30.00;
    if (rounded > 30.00) rounded = 30.00;
    if (Math.abs(rounded) < 0.001) return "";
    const sign = rounded > 0 ? "+" : "-";
    return `${sign}${Math.abs(rounded).toFixed(2)}`;
  }

  if (type === "cyl") {
    const num = parseFloat(trimmed.replace(/\+/g, ""));
    if (isNaN(num) || Math.abs(num) < 0.001) return "";
    let rounded = Math.round(num * 4) / 4;
    if (rounded < -10.00) rounded = -10.00;
    if (rounded > 10.00) rounded = 10.00;
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
    if (rounded < 5) rounded = 5;
    if (rounded > 180) rounded = 180;
    return rounded.toString();
  }

  return "";
}

const AXIS_VALUES = Array.from({ length: 36 }, (_, i) => (i + 1) * 5); // 5, 10, 15 ... 180

export function OpticalPowerInput({
  type,
  value,
  onChange,
  cylValue,
  placeholder,
  id: customId,
  className,
}: OpticalPowerInputProps) {
  const { toast } = useToast();
  const generatedId = useId();
  const fieldId = customId || generatedId;

  const activeFieldId = useActiveFieldId();
  const isActive = activeFieldId === fieldId;

  const [localValue, setLocalValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startYRef = useRef<number | null>(null);
  const startValueRef = useRef<string>("");
  const isSwipingRef = useRef<boolean>(false);
  const wasActiveOnPointerDown = useRef<boolean>(false);

  const isCylEmpty = type === "axis" && (!cylValue || cylValue.trim() === "");

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value || "");
    }
  }, [value, isFocused]);

  const displayValue = isFocused ? localValue : (value || "");

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    wasActiveOnPointerDown.current = isActive;
    startYRef.current = e.clientY;
    startValueRef.current = value || "";
    isSwipingRef.current = false;

    if (isActive && !isCylEmpty) {
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    if (startYRef.current === null) return;
    if (!wasActiveOnPointerDown.current || !isActive) return;

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
      e.preventDefault();
      const adjustedDelta = deltaY > 0 ? deltaY - MOVEMENT_THRESHOLD : deltaY + MOVEMENT_THRESHOLD;
      const steps = Math.trunc(adjustedDelta / STEP_PIXELS);

      let newVal = "";

      if (type === "sph") {
        const startNum = parsePowerValue(startValueRef.current) ?? 0;
        const newNum = Math.min(30.00, Math.max(-30.00, startNum + steps * 0.25));
        if (Math.abs(newNum) < 0.001) {
          newVal = "";
        } else {
          const sign = newNum > 0 ? "+" : "";
          newVal = `${sign}${newNum.toFixed(2)}`;
        }
      } else if (type === "cyl") {
        const startNum = parsePowerValue(startValueRef.current) ?? 0;
        const newNum = Math.min(10.00, Math.max(-10.00, startNum + steps * 0.25));
        if (Math.abs(newNum) < 0.001) {
          newVal = "";
        } else {
          const sign = newNum > 0 ? "+" : "";
          newVal = `${sign}${newNum.toFixed(2)}`;
        }
      } else if (type === "add") {
        const isStartEmpty = !startValueRef.current || startValueRef.current.trim() === "";
        if (isStartEmpty) {
          if (steps > 0) {
            const newNum = Math.min(4.00, 1.00 + steps * 0.25);
            newVal = `+${newNum.toFixed(2)}`;
          } else if (steps < 0) {
            newVal = "+1.00";
          } else {
            newVal = "";
          }
        } else {
          const startNum = parsePowerValue(startValueRef.current) ?? 1.00;
          const newNum = Math.min(4.00, Math.max(1.00, startNum + steps * 0.25));
          newVal = `+${newNum.toFixed(2)}`;
        }
      } else if (type === "axis") {
        const isStartEmpty = !startValueRef.current || startValueRef.current.trim() === "";
        // Requirement: Empty AXIS baseline starts at 180.
        // Circular wrap:
        // UP (+ steps): 180 -> 5 -> 10 -> 15 ... -> 175 -> 180 -> 5
        // DOWN (- steps): 180 -> 175 -> 170 ... -> 10 -> 5 -> 180 -> 175
        let startIndex = 35; // index of 180 in AXIS_VALUES
        if (!isStartEmpty) {
          const startNum = parseInt(startValueRef.current, 10);
          if (!isNaN(startNum) && startNum >= 5 && startNum <= 180) {
            const idx = AXIS_VALUES.indexOf(Math.round(startNum / 5) * 5);
            if (idx !== -1) startIndex = idx;
          }
        }

        if (steps === 0) {
          newVal = startValueRef.current || (isStartEmpty ? "180" : "");
        } else {
          let newIndex = (startIndex + steps) % 36;
          if (newIndex < 0) {
            newIndex = ((newIndex % 36) + 36) % 36;
          }
          newVal = AXIS_VALUES[newIndex].toString();
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
    } else {
      // It was a tap! Activate this field.
      setActiveFieldId(fieldId);
    }

    startYRef.current = null;
    isSwipingRef.current = false;
    wasActiveOnPointerDown.current = false;
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLInputElement>) => {
    if (startYRef.current !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    startYRef.current = null;
    isSwipingRef.current = false;
    wasActiveOnPointerDown.current = false;
  };

  const handleFocus = () => {
    setActiveFieldId(fieldId);
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
    setLocalValue(e.target.value);
    onChange(e.target.value);
  };

  const inputMode = type === "axis" ? "numeric" : "decimal";

  return (
    <Input
      ref={inputRef}
      id={fieldId}
      type="text"
      inputMode={inputMode}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={cn(
        "select-none transition-all duration-150",
        isActive ? "ring-2 ring-primary border-primary bg-primary/5" : "touch-pan-y",
        className
      )}
      style={{
        touchAction: isActive ? "none" : "pan-y",
      }}
    />
  );
}
