import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = { _id?: string; type: string; minutes: number; points: number; occurredAt?: string };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then(({ activities: result }) => { if (active) setActivities(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unknown error'); });
    return () => { active = false; };
  }, []);

  return <CapabilityCard title="Activities" description="Track student activity minutes and points.">
    {error ? <p role="alert">Unable to load activities: {error}</p>
      : activities === null ? <p role="status">Loading activities...</p>
        : activities.length === 0 ? <p>No activities yet.</p>
          : <ul className="list-group">{activities.map((activity, index) => <li className="list-group-item" key={activity._id ?? `${activity.type}-${index}`}>
            <strong>{activity.type}</strong><span> {activity.minutes} minutes · {activity.points} points</span>
          </li>)}</ul>}
  </CapabilityCard>;
}
