import { expect, test } from 'bun:test';
import { GroupApply } from '../../../packages/cli/src/commands/group/apply';

test('group apply command exists', () => {
  expect(GroupApply).toBeDefined();
});

test('group apply has correct description', () => {
  expect(GroupApply.description).toBe('Apply a semantic group configuration from file');
});

test('group apply requires file argument', () => {
  expect(GroupApply.args).toBeDefined();
  expect(GroupApply.args.file).toBeDefined();
  expect(GroupApply.args.file.required).toBe(true);
});