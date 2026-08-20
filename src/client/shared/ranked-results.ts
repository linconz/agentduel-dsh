import type { Character, Team } from '../api/client.js'

export function rankedResults(
  item: Pick<Character | Team, 'ranked_wins' | 'ranked_draws' | 'ranked_losses'>
): { wins: number; draws: number; losses: number } {
  return {
    wins: item.ranked_wins,
    draws: item.ranked_draws,
    losses: item.ranked_losses
  }
}
