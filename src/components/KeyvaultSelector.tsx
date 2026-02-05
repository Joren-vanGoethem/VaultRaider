import type { KeyVault } from "../types/azure";

interface LeyvaultSelectorProps {
  keyvaults: KeyVault[];
  selectedKeyvault: string | undefined;
  onKeyvaultChange: (subscriptionId: string) => void;
}

export function KeyvaultSelector({
  keyvaults,
  selectedKeyvault,
  onKeyvaultChange,
}: LeyvaultSelectorProps) {
  return (
    <div className="mb-6">
      <label
        htmlFor="keyvault-select"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Select Keyvault
      </label>
      <select
        id="keyvault-select"
        value={selectedKeyvault ?? ""}
        onChange={(e) => onKeyvaultChange(e.target.value)}
        className="w-full p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
      >
        {keyvaults.map((sub) => (
          <option key={sub.id} value={sub.id}>
            {sub.name} ({sub.id})
          </option>
        ))}
      </select>
    </div>
  );
}
