import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Workout = { _id?: string; title: string; focus: string; minutes: number; difficulty: string; reason: string };
const userEmail = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Workout[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions: result }) => { if (active) setSuggestions(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unknown error'); });
    return () => { active = false; };
  }, []);

  return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
    {error ? <p role="alert">Unable to load workout suggestions: {error}</p>
      : suggestions === null ? <p role="status">Loading workout suggestions...</p>
        : suggestions.length === 0 ? <p>No workout suggestions yet.</p>
          : <ul className="list-group">{suggestions.map((workout, index) => <li className="list-group-item" key={workout._id ?? `${workout.title}-${index}`}>
            <h3 className="h6 mb-1">{workout.title}</h3>
            <p className="mb-1">{workout.focus} · {workout.minutes} minutes · {workout.difficulty}</p>
            <p className="mb-0">{workout.reason}</p>
          </li>)}</ul>}
  </CapabilityCard>;
}
