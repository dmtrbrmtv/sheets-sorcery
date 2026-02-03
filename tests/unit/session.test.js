import { describe, expect, it, vi } from "vitest";
import { ensureSessionId, readSessionId, SESSION_HASH_PREFIX } from "../../docs/session.js";

describe("session", () => {
	it("reads session id from hash", () => {
		const location = { hash: "#/s/abc123", search: "?s=fromquery", pathname: "/" };
		expect(readSessionId(location)).toEqual({ sessionId: "abc123", source: "hash" });
	});

	it("trims trailing slash in hash", () => {
		const location = { hash: "#/s/abc123/", search: "", pathname: "/" };
		expect(readSessionId(location)).toEqual({ sessionId: "abc123", source: "hash" });
	});

	it("falls back to query param when hash missing", () => {
		const location = { hash: "", search: "?s=query", pathname: "/" };
		expect(readSessionId(location)).toEqual({ sessionId: "query", source: "query" });
	});

	it("keeps hash session and does not rewrite url", () => {
		const history = { replaceState: vi.fn() };
		const location = { hash: "#/s/keep", search: "", pathname: "/game" };
		const result = ensureSessionId({ location, history, crypto: { randomUUID: () => "newid" } });
		expect(result).toEqual({ sessionId: "keep", explicit: true, source: "hash" });
		expect(history.replaceState).not.toHaveBeenCalled();
	});

	it("canonicalizes query param to hash", () => {
		const history = { replaceState: vi.fn() };
		const location = { hash: "", search: "?s=abc&foo=1", pathname: "/game" };
		const result = ensureSessionId({ location, history, crypto: { randomUUID: () => "newid" } });
		expect(result).toEqual({ sessionId: "abc", explicit: true, source: "query" });
		expect(history.replaceState).toHaveBeenCalledWith(null, "", `/game?foo=1${SESSION_HASH_PREFIX}abc`);
	});

	it("generates new session when none provided", () => {
		const history = { replaceState: vi.fn() };
		const location = { hash: "", search: "", pathname: "/game" };
		const result = ensureSessionId({ location, history, crypto: { randomUUID: () => "genid" } });
		expect(result).toEqual({ sessionId: "genid", explicit: false, source: "generated" });
		expect(history.replaceState).toHaveBeenCalledWith(null, "", `/game${SESSION_HASH_PREFIX}genid`);
	});
});
