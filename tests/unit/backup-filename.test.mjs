import test from 'node:test';
import assert from 'node:assert/strict';
import { backupFilename } from '../../dist/src/domain/backup-filename.js';
test('backup names use device-local date and time, preserve trip date and avoid same-millisecond collisions', () => {
    const time = new Date(2026, 9, 5, 1, 12, 0, 123);
    const first = backupFilename('roamnest-2026-10-28.json', time),
        second = backupFilename('roamnest-2026-10-28.json', time);
    assert.equal(first, 'roamnest-2026-10-28-20261005-011200-123.json');
    assert.equal(second, 'roamnest-2026-10-28-20261005-011200-123-2.json');
    assert.equal(
        backupFilename('roamnest-original-saved-data.json', time),
        'roamnest-original-saved-data-20261005-011200-123.json',
    );
    assert.doesNotMatch(first, /[<>:"/\\|?*]/);
});
