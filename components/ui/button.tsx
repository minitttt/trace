import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-white hover:bg-[#263453] dark:bg-[#2d3d72] dark:hover:bg-[#3a4d8f] dark:text-[#f2f4ff]",
        secondary:
          "bg-mint text-ink hover:bg-[#d4dcff] dark:bg-[#26345e] dark:text-[#c1ccff] dark:hover:bg-[#33457e]",
        outline: "border border-border-token bg-surface/70 text-fg hover:bg-surface-muted",
        ghost: "text-text-muted hover:bg-surface-muted hover:text-fg",
        coral: "bg-coral text-white hover:bg-[#d9735d] dark:bg-[#ad4e38] dark:hover:bg-[#be5a43]",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-5",
        lg: "h-13 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
