import { Activity, Team, User, Workout } from '../models/index.js';

function reject(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) reject(400, `${field} is required`);
  return value.trim();
}

function validId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) reject(400, `${field} must be a valid ID`);
  return value;
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) reject(400, 'Activity data is required');
  const userId = validId(input.userId, 'userId');
  const teamId = validId(input.teamId, 'teamId');
  const type = requiredText(input.type, 'type');
  if (typeof input.minutes !== 'number' || !Number.isFinite(input.minutes) || input.minutes < 1) {
    reject(400, 'minutes must be a positive number');
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) reject(404, 'User or team not found');

  return Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes: input.minutes,
    points: input.minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) reject(400, 'Team data is required');
  const name = requiredText(input.name, 'name');
  const mascot = requiredText(input.mascot, 'mascot');
  const members = input.members ?? [];
  if (!Array.isArray(members)) reject(400, 'members must be an array');
  const memberIds = [...new Set(members.map((member) => validId(member, 'member')))];
  const users = memberIds.length ? await User.find({ _id: { $in: memberIds } }) : [];
  if (users.length !== memberIds.length) reject(404, 'One or more team members were not found');

  const team = await Team.create({ name, mascot, members: users.map((user) => user._id) });
  for (const user of users) {
    if (user.team && user.team.toString() !== team._id.toString()) {
      await Team.updateOne({ _id: user.team }, { $pull: { members: user._id } });
    }
  }
  if (users.length) {
    await User.updateMany({ _id: { $in: users.map((user) => user._id) } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate<{ _id: unknown; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map((entry) => [String(entry._id), entry.totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(String(team._id)) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) reject(404, 'User not found');

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const goal = user.fitnessGoal?.trim().toLowerCase();
  const activityType = recentActivity?.type.trim().toLowerCase();
  const activityFocus = activityType && /^(run|running|cycle|cycling|bike|biking|walk|walking|swim|swimming)$/.test(activityType)
    ? 'endurance'
    : activityType;
  const workouts = await Workout.find().lean();
  const hasGoalWorkout = Boolean(goal && workouts.some((workout) => workout.focus.toLowerCase() === goal));
  const hasActivityWorkout = Boolean(activityFocus && workouts.some((workout) => workout.focus.toLowerCase() === activityFocus));
  const focus = hasGoalWorkout ? goal : hasActivityWorkout ? activityFocus : goal || activityFocus;
  const ordered = focus
    ? [...workouts].sort((left, right) => Number(right.focus.toLowerCase() === focus) - Number(left.focus.toLowerCase() === focus))
    : workouts;

  return ordered.map((workout) => ({
    ...workout,
    reason: workout.focus.toLowerCase() === goal && goal && hasGoalWorkout
      ? `Matches your ${workout.focus} goal.`
      : workout.focus.toLowerCase() === activityFocus && activityFocus && hasActivityWorkout
        ? `Recommended from your recent ${recentActivity!.type} activity.`
        : `A ${workout.focus} option to support your fitness routine.`,
  }));
}

export { User };
