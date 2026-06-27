import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-60",
          variant === "default" &&
            "bg-accent text-white hover:bg-accent-hover shadow-[0_10px_30px_rgba(244,63,125,0.22)]",
          variant === "secondary" &&
            "border border-glass-border bg-glass-light text-text-primary hover:border-accent/60",
          variant === "ghost" &&
            "text-text-secondary hover:bg-glass-light hover:text-text-primary",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
