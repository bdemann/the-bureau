export type Rank =
    | 'patriot'
    | 'loyal_citizen'
    | 'citizen'
    | 'disengaged_citizen'
    | 'suspected_communist';

export function getRank(score: number): Rank {
    if (score >= 130) return 'patriot';
    if (score >= 100) return 'loyal_citizen';
    if (score >= 70)  return 'citizen';
    if (score >= 40)  return 'disengaged_citizen';
    return 'suspected_communist';
}

export function rankColor(rank: Rank): string {
    switch (rank) {
        case 'patriot':             return '#FFD700';
        case 'loyal_citizen':       return '#C8A84B';
        case 'citizen':             return '#F5EFE0';
        case 'disengaged_citizen':  return '#F5A623';
        case 'suspected_communist': return '#FF6B6B';
    }
}
