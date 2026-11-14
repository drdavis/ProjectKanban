import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const buttonVariants = cva("button", {
  variants: {variant: {default: "primary", outline: "secondary", ghost: "ghost"}},
  defaultVariants: {variant: "default"},
});

export function Button({asChild, variant, className, type = "button", key, ...props}: React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {asChild?: boolean}) {
  const Component = asChild ? Slot : "button";
  return <Component key={key == null ? undefined : String(key)} type={asChild ? undefined : type} className={twMerge(clsx(buttonVariants({variant}), className))} {...props}/>;
}
