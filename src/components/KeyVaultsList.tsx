import {Suspense} from 'react'
import {fetchKeyVaults, fetchKeyVaultsKey} from '../services/azureService'
import {KeyVaultCard} from './KeyVaultCard'
import {LoadingSpinner} from './LoadingSpinner'
import {useSuspenseQuery} from "@tanstack/react-query";

interface KeyVaultsListProps {
  subscriptionId: string;
}

export function KeyVaultsList({ subscriptionId }: KeyVaultsListProps) {
  console.log("render")
  return (
    <Suspense fallback={<VaultsLoadingSpinner />}>
      <Content subscriptionId={subscriptionId} />
    </Suspense>
  )
}

function Content({ subscriptionId }: KeyVaultsListProps) {
  console.log("render content")

  const {data: keyvaults} = useSuspenseQuery ({
    queryKey: [fetchKeyVaultsKey, subscriptionId],
    queryFn: () => fetchKeyVaults(subscriptionId),
  })

  if (keyvaults == null || keyvaults.length === 0) {
    return <div>No Key Vaults found.</div>
  }

  return (
    <div className="grid gap-4">
      {keyvaults.map(v => (
        <KeyVaultCard key={v.id} vault={v} />
      ))}
    </div>
  )
}

function VaultsLoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center">
      <LoadingSpinner size="md"/>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        Loading Key Vaults...
      </p>
    </div>
  )
}
