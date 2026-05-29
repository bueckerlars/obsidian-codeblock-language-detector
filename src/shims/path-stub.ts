/**
 * Minimal path stub for bundled dependencies that reference path.join/resolve.
 */
export function join(...parts: string[]): string {
	return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}

export function resolve(...parts: string[]): string {
	return join(...parts);
}

export function dirname(p: string): string {
	const i = p.lastIndexOf('/');
	return i >= 0 ? p.slice(0, i) : '';
}

export function basename(p: string): string {
	const i = p.lastIndexOf('/');
	return i >= 0 ? p.slice(i + 1) : p;
}

export default { join, resolve, dirname, basename };
