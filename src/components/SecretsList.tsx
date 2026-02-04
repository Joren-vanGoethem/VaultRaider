import {SecretCard} from './SecretCard'
import type {Secret} from '../types/secrets'

interface SecretsListProps {
  secrets: Secret[]
  vaultUri: string
  searchQuery: string
  shouldLoadAll: boolean
}

export function SecretsList({secrets, vaultUri, searchQuery, shouldLoadAll}: SecretsListProps) {
  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
      {secrets.map((secret) => (
        <SecretCard
          key={secret.id}
          secret={secret}
          vaultUri={vaultUri}
          searchQuery={searchQuery}
          shouldLoad={shouldLoadAll}
        />
      ))}
    </div>
  )
}
