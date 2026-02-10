import type { DeletedSecretItem } from "../types/secrets";
import { DeletedSecretCard } from "./DeletedSecretCard";

interface DeletedSecretsListProps {
  secrets: DeletedSecretItem[];
  vaultUri: string;
  canRecover: boolean;
  canPurge: boolean;
}

export function DeletedSecretsList({
  secrets,
  vaultUri,
  canRecover,
  canPurge,
}: DeletedSecretsListProps) {
  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
      {secrets.map((secret) => (
        <DeletedSecretCard
          key={secret.id}
          secret={secret}
          vaultUri={vaultUri}
          canRecover={canRecover}
          canPurge={canPurge}
        />
      ))}
    </div>
  );
}
