// Unknown messages are warnings by default. Source keys keep classification
// independent of locale and prevent validation failures looking successful.
const informational = new Set([
    'Stop removed.',
    'Stop added.',
    'Saved trip deleted.',
    'Backup exported.',
    'Place saved.',
    'Reviewed attraction changes applied to the current trip.',
    'Missing place details updated in the current trip.',
    'Backup imported as a separate trip.',
]);
export function notificationKind(key: string): 'info' | 'warning' {
    return !key || informational.has(key) ? 'info' : 'warning';
}
