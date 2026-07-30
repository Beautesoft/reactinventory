import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getQtyPlaceholderForItem,
  isQtyInputInvalid,
  qtyValidationMessageForItem,
  formatQtyInputValue,
  sanitizeQtyInputValue,
  shouldBlockQtyKey,
} from "@/utils/uomDecimalQty";

export default function QtyInput({
  item,
  value,
  allowNegative = false,
  className,
  toastOnInvalid = true,
  onChange,
  onKeyDown,
  type: _typeProp,
  step: _stepProp,
  inputMode: inputModeProp,
  ...props
}) {
  const qtyItem = item ?? { allowDecimalQty: false };
  const allowDecimal = qtyItem?.allowDecimalQty === true;
  const invalid = isQtyInputInvalid(value, qtyItem, { allowNegative });
  const errorMessage = qtyValidationMessageForItem(qtyItem);
  const wasInvalidRef = useRef(false);

  useEffect(() => {
    const becameInvalid = invalid && !wasInvalidRef.current;
    wasInvalidRef.current = invalid;

    if (
      toastOnInvalid &&
      becameInvalid &&
      value !== "" &&
      value !== null &&
      value !== undefined
    ) {
      toast.error(errorMessage);
    }
  }, [invalid, value, toastOnInvalid, errorMessage]);

  const handleKeyDown = (event) => {
    if (shouldBlockQtyKey(event, qtyItem, { allowNegative })) {
      event.preventDefault();
    }
    onKeyDown?.(event);
  };

  const handleChange = (event) => {
    const sanitized = sanitizeQtyInputValue(event.target.value, qtyItem, {
      allowNegative,
    });

    if (sanitized === null) {
      if (toastOnInvalid && !allowDecimal) {
        toast.error(errorMessage);
      }
      return;
    }

    if (sanitized === event.target.value) {
      onChange?.(event);
      return;
    }

    onChange?.({
      ...event,
      target: { ...event.target, value: sanitized },
    });
  };

  return (
    <Input
      type="text"
      inputMode={inputModeProp ?? (allowDecimal ? "decimal" : "numeric")}
      placeholder={getQtyPlaceholderForItem()}
      value={formatQtyInputValue(value)}
      aria-invalid={invalid || undefined}
      className={cn(
        className,
        invalid && "border-red-500 focus-visible:ring-red-500"
      )}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      {...props}
    />
  );
}
