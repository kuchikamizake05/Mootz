import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { ArrowLeft } from "lucide-react";

type Variant = "primary" | "secondary" | "soft";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "raised bg-mootz-deep text-white",
  secondary: "raised bg-mootz-surface text-mootz-deep",
  soft: "bg-mootz-lilac text-mootz-deep",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-[15px]",
};

const disabledClass =
  "disabled:border disabled:border-mootz-hairline disabled:bg-mootz-disabled disabled:text-mootz-muted disabled:shadow-none";

export function buttonClass({ variant = "primary", size = "md", block = false } = {} as {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-extrabold",
    variants[variant],
    sizes[size],
    block && "w-full",
    disabledClass,
  );
}

type Shared = { variant?: Variant; size?: Size; block?: boolean; icon?: LucideIcon; children: ReactNode };

export function Button({ variant, size, block, icon: Icon, className, children, ...props }: Shared & ComponentProps<"button">) {
  return (
    <button type="button" className={cn(buttonClass({ variant, size, block }), className)} {...props}>
      {Icon && <Icon aria-hidden size={size === "lg" ? 21 : 19} className="shrink-0" strokeWidth={2.25} />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, block, icon: Icon, className, children, ...props }: Shared & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(buttonClass({ variant, size, block }), className)} {...props}>
      {Icon && <Icon aria-hidden size={size === "lg" ? 21 : 19} className="shrink-0" strokeWidth={2.25} />}
      {children}
    </Link>
  );
}

/** Round floating control (Close 44px, Locate me / Friends 56px). The label is the accessible name. */
export function IconButton({
  icon: Icon,
  label,
  size = 44,
  className,
  ...props
}: { icon: LucideIcon; label: string; size?: 44 | 56 } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "raised inline-flex shrink-0 items-center justify-center rounded-full bg-mootz-surface text-mootz-deep",
        size === 44 ? "size-11" : "size-14",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden size={size === 44 ? 24 : 25} strokeWidth={2.25} />
    </button>
  );
}

export function BackButton({ label = "Back", className, ...props }: { label?: string } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button type="button" aria-label={label} title={label}
      className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full text-mootz-deep", className)} {...props}>
      <ArrowLeft aria-hidden size={24} strokeWidth={2.25} />
    </button>
  );
}
