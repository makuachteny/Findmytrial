import type { Visit } from './types';

export function initials(name: string): string {
  return name
    .replace('Dr. ', '')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Registry coordinates are city-level, so a study in Boston itself comes back as 0 miles. */
export function formatMiles(miles: number, unit: string): string {
  return miles < 1 ? `Less than 1 ${unit}` : `${miles} ${unit}`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function stamp(iso: string): string {
  return `${longDate(iso)} · ${clockTime(iso)}`;
}

function visitDate(visit: Visit): Date {
  return new Date(`${visit.date}T${visit.time}`);
}

export function visitDay(visit: Visit): string {
  return visitDate(visit).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function visitTime(visit: Visit): string {
  return clockTime(visitDate(visit).toISOString());
}

export function visitMonth(visit: Visit): string {
  return visitDate(visit).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

export function visitDayOfMonth(visit: Visit): number {
  return visitDate(visit).getDate();
}
