import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, checkPin } from '../src/pin';

test('hashPin is deterministic', () => {
  assert.equal(hashPin('1234'), hashPin('1234'));
});

test('hashPin differs for different inputs', () => {
  assert.notEqual(hashPin('1234'), hashPin('5678'));
  assert.notEqual(hashPin('1234'), hashPin('12340'));
});

test('checkPin matches the original PIN', () => {
  const h = hashPin('246810');
  assert.equal(checkPin('246810', h), true);
  assert.equal(checkPin('246811', h), false);
});
