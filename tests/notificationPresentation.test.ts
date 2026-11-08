import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notificationPresentation } from '../src/hooks/notificationPresentation.ts';

test('active expiry stays in-app; a handler after Home or lock permits system presentation', () => {
  for (const sound of ['default', 'bell.wav', true, false, null, undefined]) {
    const active = notificationPresentation(true, sound);
    assert.deepEqual(active, { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false });
    const exited = notificationPresentation(false, sound);
    assert.equal(exited.shouldShowBanner, true); assert.equal(exited.shouldShowList, true);
    assert.equal(exited.shouldPlaySound, typeof sound === 'string' || sound === true);
    assert.equal(exited.shouldSetBadge, false);
  }
});
