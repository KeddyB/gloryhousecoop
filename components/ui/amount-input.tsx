import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface AmountInputProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value: string | number;
  onValueChange: (value: string) => void;
}

export function AmountInput({
  value,
  onValueChange,
  className,
  ...props
}: AmountInputProps) {
  // Format numeric value for display
  const formatDisplayValue = (val: string | number) => {
    if (!val && val !== 0) return "";
    const stringValue = val.toString().replace(/,/g, "");
    if (isNaN(Number(stringValue))) return stringValue;

    // Split into integer and decimal parts
    const parts = stringValue.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const [displayValue, setDisplayValue] = React.useState(
    formatDisplayValue(value)
  );

  // Sync display value when external value changes
  React.useEffect(() => {
    const formatted = formatDisplayValue(value);
    if (formatted !== displayValue) {
      setDisplayValue(formatted);
    }
  }, [value, displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Remove everything except numbers and decimal point
    const numericValue = rawValue.replace(/[^\d.]/g, "");

    // Ensure only one decimal point
    const dots = numericValue.match(/\./g);
    if (dots && dots.length > 1) return;

    // Call external handler with numeric string
    onValueChange(numericValue);

    // Update local display value with formatting
    setDisplayValue(formatDisplayValue(numericValue));
  };

  return (
    <Input
      {...props}
      type="text"
      value={displayValue}
      onChange={handleChange}
      className={cn(className)}
    />
  );
}
