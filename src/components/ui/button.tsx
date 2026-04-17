import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
  secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 disabled:opacity-50",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100 disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        "disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
});
