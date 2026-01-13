import { Link } from '@tanstack/react-router'

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
}

export function NavLink({ to, children }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-medium"
      activeProps={{
        className: "text-primary-500 dark:text-primary-400 font-bold underline underline-offset-4"
      }}
    >
      {children}
    </Link>
  );
}

