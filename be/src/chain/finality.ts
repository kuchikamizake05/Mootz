export interface ChainObservation {
  observed_status?: 'pending' | 'success' | 'reverted' | 'mismatched' | null;
  receipt_block_number?: string | null;
  finalized_at?: Date | null;
}

export function presentFinality(observation: ChainObservation) {
  const chainOutcome = observation.observed_status ?? 'unverified';
  const included = (chainOutcome === 'success' || chainOutcome === 'reverted') && observation.receipt_block_number != null;
  const finality = included ? (observation.finalized_at ? 'finalized' : 'included') : 'unverified';
  return { finality, chainOutcome };
}

export function claimChainStatus(status: string, observation: ChainObservation): string {
  switch (observation.observed_status) {
    case 'success': return observation.receipt_block_number != null ? 'included' : 'pending';
    case 'reverted': return observation.receipt_block_number != null ? 'failed' : 'pending';
    case 'pending': return 'pending';
    case 'mismatched': return status === 'failed' ? 'failed' : 'pending';
    default: return status;
  }
}

export function meetChainStatus(status: 'pending' | 'recorded' | 'not_saved', observation: ChainObservation) {
  switch (observation.observed_status) {
    case 'success': return observation.receipt_block_number != null ? 'recorded' : 'pending';
    case 'reverted': return observation.receipt_block_number != null ? 'not_saved' : 'pending';
    case 'pending': return 'pending';
    case 'mismatched': return status === 'not_saved' ? 'not_saved' : 'pending';
    default: return status;
  }
}
