interface AvatarProps {
  name?: string;
  email: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-base",
  lg: "w-14 h-14 text-xl",
};

export function Avatar({ name, email, size = "md" }: AvatarProps) {
  const initial = name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold flex-shrink-0`}
    >
      {initial}
    </div>
  );
}
