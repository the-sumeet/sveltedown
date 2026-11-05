import { describe, expect, it, vi } from 'vitest';
import {
	Action,
	Cell,
	DerivedCell,
	Realm,
	Signal,
	debounceTime,
	filter,
	map,
	mapTo,
	onNext,
	once,
	scan,
	withLatestFrom
} from '#lib/realm/index.js';

describe('Realm', () => {
	it('holds cell values, and publishes without calling subscribers on subscribe', () => {
		const cell$ = Cell('a');
		const realm = new Realm();
		const subscriber = vi.fn();
		realm.sub(cell$, subscriber);
		expect(subscriber).not.toHaveBeenCalled();
		expect(realm.getValue(cell$)).toBe('a');
		realm.pub(cell$, 'b');
		expect(subscriber).toHaveBeenCalledExactlyOnceWith('b');
		expect(realm.getValue(cell$)).toBe('b');
	});

	it('does not re-emit equal values of a distinct cell, unlike a signal', () => {
		const cell$ = Cell(1);
		const signal$ = Signal<number>();
		const realm = new Realm();
		const onCell = vi.fn();
		const onSignal = vi.fn();
		realm.sub(cell$, onCell);
		realm.sub(signal$, onSignal);
		realm.pub(cell$, 1);
		realm.pub(signal$, 1);
		realm.pub(signal$, 1);
		expect(onCell).not.toHaveBeenCalled();
		expect(onSignal).toHaveBeenCalledTimes(2);
	});

	it('keeps state separate per realm and runs definitions once per realm', () => {
		const init = vi.fn();
		const cell$ = Cell(0, init);
		const first = new Realm();
		const second = new Realm();
		first.pub(cell$, 1);
		first.getValue(cell$);
		expect(second.getValue(cell$)).toBe(0);
		expect(init).toHaveBeenCalledTimes(2);
	});

	it('emits a diamond dependency once per pass, with consistent values', () => {
		const source$ = Cell(1);
		const realm = new Realm();
		const double$ = realm.pipe(
			source$,
			map((value) => value * 2)
		);
		const triple$ = realm.pipe(
			source$,
			map((value) => value * 3)
		);
		const subscriber = vi.fn();
		realm.sub(realm.combine<[number, number]>(double$, triple$), subscriber);
		realm.pub(source$, 2);
		expect(subscriber).toHaveBeenCalledExactlyOnceWith([4, 6]);
	});

	it('publishes several nodes in a single pass with pubIn', () => {
		const a$ = Cell(0);
		const b$ = Cell(0);
		const realm = new Realm();
		const subscriber = vi.fn();
		realm.sub(realm.combine<[number, number]>(a$, b$), subscriber);
		realm.pubIn({ [a$]: 1, [b$]: 2 });
		expect(subscriber).toHaveBeenCalledExactlyOnceWith([1, 2]);
	});

	it('skips downstream nodes when a filter drops the value', () => {
		const source$ = Signal<number>();
		const realm = new Realm();
		const subscriber = vi.fn();
		const even$ = realm.pipe(
			source$,
			filter((value) => value % 2 === 0)
		);
		realm.sub(
			realm.pipe(
				even$,
				map((value) => value + 1)
			),
			subscriber
		);
		realm.pub(source$, 1);
		realm.pub(source$, 2);
		expect(subscriber).toHaveBeenCalledExactlyOnceWith(3);
	});

	it('reads pulled values without reacting to them', () => {
		const source$ = Signal<string>();
		const pulled$ = Cell(1);
		const realm = new Realm();
		const subscriber = vi.fn();
		realm.sub(realm.pipe(source$, withLatestFrom<string, [number]>(pulled$)), subscriber);
		realm.pub(pulled$, 2);
		expect(subscriber).not.toHaveBeenCalled();
		realm.pub(source$, 'x');
		expect(subscriber).toHaveBeenCalledExactlyOnceWith(['x', 2]);
	});

	it('supports the remaining operators', () => {
		const source$ = Signal<number>();
		const realm = new Realm();
		const scanned = vi.fn();
		const first = vi.fn();
		const mapped = vi.fn();
		realm.sub(
			realm.pipe(
				source$,
				scan((sum: number, value: number) => sum + value, 0)
			),
			scanned
		);
		realm.sub(realm.pipe(source$, once()), first);
		realm.sub(realm.pipe(source$, mapTo('x')), mapped);
		realm.pub(source$, 1);
		realm.pub(source$, 2);
		expect(scanned.mock.calls).toEqual([[1], [3]]);
		expect(first).toHaveBeenCalledExactlyOnceWith(1);
		expect(mapped).toHaveBeenCalledTimes(2);
	});

	it('pairs a value with the next value of another node using onNext', () => {
		const source$ = Signal<number>();
		const next$ = Signal<string>();
		const realm = new Realm();
		const subscriber = vi.fn();
		realm.sub(realm.pipe(source$, onNext<number, string>(next$)), subscriber);
		realm.pub(next$, 'ignored');
		realm.pub(source$, 1);
		realm.pub(next$, 'a');
		realm.pub(next$, 'ignored');
		expect(subscriber).toHaveBeenCalledExactlyOnceWith([1, 'a']);
	});

	it('debounces values', () => {
		vi.useFakeTimers();
		const source$ = Signal<number>();
		const realm = new Realm();
		const subscriber = vi.fn();
		realm.sub(realm.pipe(source$, debounceTime(10)), subscriber);
		realm.pub(source$, 1);
		realm.pub(source$, 2);
		vi.advanceTimersByTime(10);
		vi.useRealTimers();
		expect(subscriber).toHaveBeenCalledExactlyOnceWith(2);
	});

	it('changes a cell from a source with changeWith', () => {
		const items$ = Cell<string[]>([]);
		const add$ = Signal<string>((realm, add) => {
			realm.changeWith(items$, add, (items, item) => [...items, item]);
		});
		const realm = new Realm();
		realm.pub(add$, 'a');
		realm.pub(add$, 'b');
		expect(realm.getValue(items$)).toEqual(['a', 'b']);
	});

	it('replaces the previous singletonSub, leaving sub in place', () => {
		const signal$ = Signal<number>();
		const realm = new Realm();
		const [first, second, regular] = [vi.fn(), vi.fn(), vi.fn()];
		realm.sub(signal$, regular);
		realm.singletonSub(signal$, first);
		realm.singletonSub(signal$, second);
		realm.pub(signal$, 1);
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledOnce();
		expect(regular).toHaveBeenCalledOnce();
	});

	it('supports actions and derived cells', () => {
		const action$ = Action();
		const source$ = Cell(1);
		const derived$ = DerivedCell(0, (realm) =>
			realm.pipe(
				source$,
				map((value) => value * 10)
			)
		);
		const realm = new Realm();
		const subscriber = vi.fn();
		realm.sub(action$, subscriber);
		realm.pub(action$);
		realm.getValue(derived$);
		realm.pub(source$, 2);
		expect(subscriber).toHaveBeenCalledOnce();
		expect(realm.getValue(derived$)).toBe(20);
	});
});
