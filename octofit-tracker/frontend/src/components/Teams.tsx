import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Member = string | { _id?: string; name?: string };
type Team = { _id?: string; name: string; mascot?: string; members: Member[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams: result }) => { if (active) setTeams(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unknown error'); });
    return () => { active = false; };
  }, []);

  return <CapabilityCard title="Teams" description="Manage teams and members.">
    {error ? <p role="alert">Unable to load teams: {error}</p>
      : teams === null ? <p role="status">Loading teams...</p>
        : teams.length === 0 ? <p>No teams yet.</p>
          : <ul className="list-group">{teams.map((team, index) => <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
            <h3 className="h6 mb-1">{team.name}</h3>
            <p className="mb-1">Mascot: {team.mascot ?? 'Not set'}</p>
            <p className="mb-0">Members: {team.members.map((member) => typeof member === 'string' ? member : member.name ?? member._id ?? 'Member').join(', ') || 'None'}</p>
          </li>)}</ul>}
  </CapabilityCard>;
}
