/**
 * Stub for Node.js fs — model assets are loaded via bundled loaders, not the filesystem.
 */
const unavailable = (): never => {
	throw new Error('Direct filesystem access is not available in this plugin');
};

export const readFileSync = unavailable;
export const readFile = unavailable;
export const promises = {
	readFile: unavailable,
};

export default {
	readFileSync,
	readFile,
	promises,
};
