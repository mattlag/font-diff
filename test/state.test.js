import { describe, expect, it } from 'vitest';
import {
	bothFontsLoaded,
	getState,
	onStateChange,
	setFont,
} from '../src/state.js';

describe('state', () => {
	it('should start with null fonts', () => {
		const state = getState();
		expect(state.fontA).toBeNull();
		expect(state.fontB).toBeNull();
	});

	it('should report both fonts not loaded initially', () => {
		expect(bothFontsLoaded()).toBe(false);
	});

	it('should store fontA when set', () => {
		const mockFont = {
			data: { font: { familyName: 'Test' } },
			fontFamily: 'test-1',
		};
		setFont('fontA', mockFont);
		expect(getState().fontA).toBe(mockFont);
	});

	it('should report both fonts loaded when both are set', () => {
		setFont('fontA', { data: {}, fontFamily: 'a' });
		setFont('fontB', { data: {}, fontFamily: 'b' });
		expect(bothFontsLoaded()).toBe(true);
	});

	it('should notify listeners on state change', () => {
		let called = false;
		onStateChange(() => {
			called = true;
		});
		setFont('fontA', { data: {}, fontFamily: 'test' });
		expect(called).toBe(true);
	});
});
