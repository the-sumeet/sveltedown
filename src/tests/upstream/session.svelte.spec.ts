// Ported from upstream's src/test/extension-composer.test.tsx (realm session lifecycle).
// The React composer and Strict Mode cases have no Svelte equivalent.
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { MarkdownEditor, Realm, registerRealmCleanup, type RealmPlugin } from '#lib';
import { disposeRealmSession } from '../../lib/realmSession.js';
import MethodsParent from '../fixtures/MethodsParent.svelte';
import { expectSoon } from '../dom.js';

describe('realm session lifecycle', () => {
	it('runs every cleanup in reverse order and preserves the first cleanup failure', () => {
		const realm = new Realm();
		const order: string[] = [];
		const firstFailure = new Error('later registration failed first');
		registerRealmCleanup(realm, () => order.push('first registration'));
		registerRealmCleanup(realm, () => {
			order.push('throwing registration');
			throw firstFailure;
		});
		registerRealmCleanup(realm, () => order.push('last registration'));
		expect(() => disposeRealmSession(realm)).toThrow(firstFailure);
		expect(order).toEqual(['last registration', 'throwing registration', 'first registration']);
		expect(() => disposeRealmSession(realm)).not.toThrow();
	});

	it('reports falsy cleanup failures instead of silently dropping them', () => {
		const realm = new Realm();
		registerRealmCleanup(realm, () => {
			throw false;
		});
		expect(() => disposeRealmSession(realm)).toThrow('Realm cleanup failed with a non-Error value');
	});

	it('cleans up a failed plugin session without replacing its initialization error', async () => {
		const failure = new Error('postInit failed');
		let cleanups = 0;
		const plugin: RealmPlugin = {
			init: (realm) => registerRealmCleanup(realm, () => cleanups++),
			postInit() {
				throw failure;
			}
		};
		let thrown: unknown;
		try {
			await render(MarkdownEditor, { markdown: '', plugins: [plugin] });
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBe(failure);
		expect(cleanups).toBe(1);
	});

	it('cleans up failed plugin sessions and keeps both failures when cleanup also fails', async () => {
		const initializationFailure = new Error('postInit failed');
		const cleanupFailure = new Error('cleanup failed');
		let cleanups = 0;
		const plugin: RealmPlugin = {
			init: (realm) =>
				registerRealmCleanup(realm, () => {
					cleanups++;
					throw cleanupFailure;
				}),
			postInit() {
				throw initializationFailure;
			}
		};
		let thrown: unknown;
		try {
			await render(MarkdownEditor, { markdown: '', plugins: [plugin] });
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(AggregateError);
		expect((thrown as AggregateError).errors).toEqual([initializationFailure, cleanupFailure]);
		expect(cleanups).toBe(1);
	});

	it("keeps public methods available to the parent's mount and returns the last markdown after unmount", async () => {
		const report = { mounted: false, markdown: '' };
		const { unmount } = await render(MethodsParent, { report });
		expect(report.mounted).toBe(true);
		await expectSoon(() => report.markdown === 'updated from parent mount');
		expect(report.markdown).toBe('updated from parent mount');
		await unmount();
	});
});
