import { Avatar } from './Avatar';
import { LogOut } from 'lucide-react';

interface UserInfo {
  name?: string;
  email: string;
}

interface UserProfileProps {
  userInfo: UserInfo;
  onLogout: () => void;
  compact?: boolean;
  isCollapsed?: boolean;
}

export function UserProfile({ userInfo, onLogout, compact = false, isCollapsed = false }: UserProfileProps) {
  // Collapsed mode - show only avatar with tooltip
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative group">
          <Avatar name={userInfo.name} email={userInfo.email} size="sm" />
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50">
            {userInfo.name || userInfo.email}
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors relative group"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50">
            Sign out
          </div>
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Avatar name={userInfo.name} email={userInfo.email} size="sm" />
          <span className="truncate text-xs" title={userInfo.email}>
            {userInfo.name || userInfo.email}
          </span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 hover:border-red-600 dark:hover:border-red-400 rounded transition-colors"
          title="Sign out"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-center gap-2">
        <Avatar name={userInfo.name} email={userInfo.email} size="sm" />
        <span className="hidden md:inline">{userInfo.email}</span>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 hover:border-red-600 dark:hover:border-red-400 rounded transition-colors"
        title="Sign out"
      >
        Sign Out
      </button>
    </div>
  );
}

