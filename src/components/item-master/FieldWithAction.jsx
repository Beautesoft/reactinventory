import { Label } from "@/components/ui/label";

export function FieldWithAction({
  label,
  required = false,
  labelClassName = "text-xs font-medium text-gray-500 uppercase",
  children,
  action,
}) {
  return (
    <div>
      <Label className={labelClassName}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      <div className="flex gap-2 mt-1.5 items-center">
        <div className="flex-1 min-w-0">{children}</div>
        {action}
      </div>
    </div>
  );
}

export default FieldWithAction;
