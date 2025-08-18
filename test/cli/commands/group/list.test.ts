import { expect, test } from 'bun:test';
import { GroupList } from '../../../packages/cli/src/commands/group/list';

test('group list command exists', () => {
  expect(GroupList).toBeDefined();
});

test('group list has correct description', () => {
  expect(GroupList.description).toBe('List all semantic groups');
});

test('group list supports json flag', () => {
  expect(GroupList.flags).toBeDefined();
  expect(GroupList.flags.json).toBeDefined();
});