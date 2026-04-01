import { describe, expect, it } from 'vitest';
import { formatFileSize } from '../src/utils/font-loader.js';

describe('formatFileSize', () => {
	it('should format bytes', () => {
		expect(formatFileSize(500)).toBe('500 B');
	});

	it('should format kilobytes', () => {
		expect(formatFileSize(2048)).toBe('2.0 KB');
	});

	it('should format megabytes', () => {
		expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
	});
});
