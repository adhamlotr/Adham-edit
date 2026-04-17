import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm",
        "placeholder:text-neutral-400",
        "focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600",
        "disabled:cursor-not-allowed disabled:bg-neutral-50",
        className,
      )}
      {...rest}
    />
  );
});
