import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
          {
            "bg-[var(--foreground)] text-[var(--background)]": variant === "default",
            "bg-[var(--accent)] text-[var(--accent-foreground)]": variant === "secondary",
            "bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30": variant === "success",
            "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30": variant === "warning",
            "bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30": variant === "destructive",
            "border border-[var(--border)]": variant === "outline",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }

