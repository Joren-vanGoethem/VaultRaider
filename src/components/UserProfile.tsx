import { Avatar } from './Avatar';

interface UserInfo {
  name?: string;
  email: string;
}

interface UserProfileProps {
  userInfo: UserInfo;
  onLogout: () => void;
}

export function UserProfile({ userInfo, onLogout }: UserProfileProps) {
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

