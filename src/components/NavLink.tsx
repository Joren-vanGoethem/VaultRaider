import {Link, type LinkProps} from '@tanstack/react-router'
import type React from "react";
import type { AnchorHTMLAttributes } from "react";

type NavLinkProps =
  & LinkProps
  & AnchorHTMLAttributes<HTMLAnchorElement>
  & {
  children: React.ReactNode
}

export function NavLink({ children, ...props }: NavLinkProps) {
  return (
    <Link
      {...props}
      className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-medium"
      activeProps={{
        className: "text-primary-500 dark:text-primary-400 font-bold underline underline-offset-4"
      }}
    >
      {children}
    </Link>
  );
}

