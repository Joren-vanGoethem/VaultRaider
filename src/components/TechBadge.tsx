interface TechBadgeProps {
  name: string;
  color: 'orange' | 'blue' | 'purple' | 'cyan' | 'yellow' | 'red' | 'green';
}

const colorMap = {
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
};

export function TechBadge({ name, color }: TechBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colorMap[color]}`} />
      <span className="text-gray-700 dark:text-gray-300">{name}</span>
    </div>
  );
}

