export const SESSION_HASH_PREFIX = "#/s/";
export const SESSION_QUERY_PARAM = "s";
export const STORAGE_PREFIX = "sheets-sorcery:";
export const LEGACY_KEY = "sheets-sorcery";

function normalizeSessionId(raw) {
	if (!raw) return null;
	const trimmed = raw.replace(/\/+$/, "");
	return trimmed || null;
}

export function readSessionId(location = globalThis.location) {
	const hash = location?.hash || "";
	if (hash.startsWith(SESSION_HASH_PREFIX)) {
		const raw = hash.slice(SESSION_HASH_PREFIX.length);
		const sessionId = normalizeSessionId(raw);
		if (sessionId) return { sessionId, source: "hash" };
	}

	const search = location?.search || "";
	const params = new URLSearchParams(search);
	const queryId = params.get(SESSION_QUERY_PARAM);
	if (queryId) return { sessionId: queryId, source: "query" };

	return { sessionId: null, source: "none" };
}

function stripQueryParam(search, param) {
	const params = new URLSearchParams(search || "");
	params.delete(param);
	const next = params.toString();
	return next ? `?${next}` : "";
}

function createSessionId(cryptoRef = globalThis.crypto) {
	if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function ensureSessionId({ location = globalThis.location, history = globalThis.history, crypto } = {}) {
	const { sessionId, source } = readSessionId(location);
	if (sessionId) {
		if (source === "query") {
			const nextSearch = stripQueryParam(location?.search, SESSION_QUERY_PARAM);
			const nextUrl = `${location?.pathname || ""}${nextSearch}${SESSION_HASH_PREFIX}${sessionId}`;
			history?.replaceState?.(null, "", nextUrl);
		}
		return { sessionId, explicit: true, source };
	}

	const newId = createSessionId(crypto);
	const nextSearch = stripQueryParam(location?.search, SESSION_QUERY_PARAM);
	const nextUrl = `${location?.pathname || ""}${nextSearch}${SESSION_HASH_PREFIX}${newId}`;
	history?.replaceState?.(null, "", nextUrl);
	return { sessionId: newId, explicit: false, source: "generated" };
}

export function makeStorageKey(sessionId) {
	return `${STORAGE_PREFIX}${sessionId}`;
}
