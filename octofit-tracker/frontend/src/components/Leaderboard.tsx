import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard')
      .then(({ leaderboard: result }) => { if (active) setLeaderboard(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unknown error'); });
    return () => { active = false; };
  }, []);

  return <CapabilityCard title="Leaderboard" description="Compare team point totals.">
    {error ? <p role="alert">Unable to load leaderboard: {error}</p>
      : leaderboard === null ? <p role="status">Loading leaderboard...</p>
        : leaderboard.length === 0 ? <p>No leaderboard rankings yet.</p>
          : <ol className="list-group list-group-numbered">{leaderboard.map((entry) => <li className="list-group-item d-flex justify-content-between" key={entry.rank}>
            <span>{entry.teamName}</span><strong>{entry.totalPoints} points</strong>
          </li>)}</ol>}
  </CapabilityCard>;
}
