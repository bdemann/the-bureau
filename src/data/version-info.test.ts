import { describe, it } from "node:test";
import { assert } from "@augment-vir/assert";
import { fetchLatestCommit, parseLatestCommit } from "./version-info.js";

describe("parseLatestCommit", () => {
    it("returns the commit string", () => {
        assert.strictEquals(parseLatestCommit({ commit: "abc1234" }), "abc1234");
    });
    it("trims whitespace", () => {
        assert.strictEquals(parseLatestCommit({ commit: "  abc1234\n" }), "abc1234");
    });
    it("returns undefined for empty, missing, or non-string commits", () => {
        assert.isUndefined(parseLatestCommit({ commit: "" }));
        assert.isUndefined(parseLatestCommit({ commit: "   " }));
        assert.isUndefined(parseLatestCommit({}));
        assert.isUndefined(parseLatestCommit({ commit: 5 }));
    });
    it("returns undefined for non-objects", () => {
        assert.isUndefined(parseLatestCommit(null));
        assert.isUndefined(parseLatestCommit("abc"));
        assert.isUndefined(parseLatestCommit(undefined));
    });
});

describe("fetchLatestCommit", () => {
    function fakeFetch(response: { ok: boolean; json: () => Promise<unknown> }) {
        const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
        const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
            calls.push([input, init]);
            return response as Response;
        }) as typeof fetch;
        return { fn, calls };
    }

    it("requests /version.json with cache: no-store and returns the commit", async () => {
        const { fn, calls } = fakeFetch({ ok: true, json: async () => ({ commit: "deadbee" }) });
        assert.strictEquals(await fetchLatestCommit(fn), "deadbee");
        assert.strictEquals(calls[0]![0], "/version.json");
        assert.strictEquals(calls[0]![1]?.cache, "no-store");
    });
    it("returns undefined on a non-OK response", async () => {
        const { fn } = fakeFetch({ ok: false, json: async () => ({ commit: "x" }) });
        assert.isUndefined(await fetchLatestCommit(fn));
    });
    it("returns undefined when the body is not JSON (e.g. an HTML fallback)", async () => {
        const { fn } = fakeFetch({
            ok: true,
            json: async () => {
                throw new SyntaxError("Unexpected token <");
            },
        });
        assert.isUndefined(await fetchLatestCommit(fn));
    });
    it("returns undefined when the request throws (offline)", async () => {
        const fn = (async () => {
            throw new TypeError("Failed to fetch");
        }) as typeof fetch;
        assert.isUndefined(await fetchLatestCommit(fn));
    });
});
