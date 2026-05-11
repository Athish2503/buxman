import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-xl bg-surface-3 relative overflow-hidden", className)}
      style={{ backgroundSize: '200% 100%' }}
      {...props}
    />
  )
}

export { Skeleton }
