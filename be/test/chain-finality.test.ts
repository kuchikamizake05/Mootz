import { expect, it } from 'vitest';
import { presentFinality, claimChainStatus, meetChainStatus } from '../src/chain/finality.ts';

it('leaves missing observations explicitly unverified', () => {
  expect(presentFinality({})).toEqual({ finality: 'unverified', chainOutcome: 'unverified' });
  expect(claimChainStatus('included', {})).toBe('included');
  expect(meetChainStatus('recorded', {})).toBe('recorded');
});

it('distinguishes semantic inclusion from finalized successful execution', () => {
  const observed = { observed_status: 'success' as const, receipt_block_number: '20', finalized_at: null };
  expect(presentFinality(observed)).toEqual({ finality: 'included', chainOutcome: 'success' });
  expect(presentFinality({ ...observed, finalized_at: new Date() })).toEqual({ finality: 'finalized', chainOutcome: 'success' });
});

it('never presents removed or mismatched inclusion as a successful chain record', () => {
  for (const observed_status of ['pending', 'mismatched'] as const) {
    const observation = { observed_status, receipt_block_number: null, finalized_at: null };
    expect(claimChainStatus('included', observation)).toBe('pending');
    expect(meetChainStatus('recorded', observation)).toBe('pending');
    expect(presentFinality(observation).finality).toBe('unverified');
  }
});

it('a finalized revert is final evidence of failure, never ownership or a recorded Meet', () => {
  const observation = { observed_status: 'reverted' as const, receipt_block_number: '20', finalized_at: new Date() };
  expect(presentFinality(observation)).toEqual({ finality: 'finalized', chainOutcome: 'reverted' });
  expect(claimChainStatus('included', observation)).toBe('failed');
  expect(meetChainStatus('recorded', observation)).toBe('not_saved');
});

it('does not promote malformed observation evidence to finality', () => {
  expect(presentFinality({ observed_status: 'mismatched', finalized_at: new Date(), receipt_block_number: '20' }).finality).toBe('unverified');
  expect(presentFinality({ observed_status: 'success', finalized_at: new Date(), receipt_block_number: null }).finality).toBe('unverified');
  expect(claimChainStatus('pending', { observed_status: 'success', receipt_block_number: null })).toBe('pending');
  expect(meetChainStatus('pending', { observed_status: 'success', receipt_block_number: null })).toBe('pending');
});
