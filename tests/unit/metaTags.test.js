import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const META_DESCRIPTION =
	"A spreadsheet-inspired tactical RPG: gather resources, craft gear, and battle across a living map. Play now in your browser.";
const META_TITLE = "Sheets & Sorcery — Tactical RPG in your browser";
const META_URL = "https://dmtrbrmtv.github.io/sheets-sorcery/";
const META_IMAGE = "https://dmtrbrmtv.github.io/sheets-sorcery/poster.png";
const META_IMAGE_ALT = "Sheets & Sorcery poster";

function parseAttributes(tag) {
	const attrs = {};
	const attrRegex = /(\w[\w:-]*)\s*=\s*["']([^"']*)["']/g;
	let match = attrRegex.exec(tag);
	while (match) {
		const [, key, value] = match;
		attrs[key] = value;
		match = attrRegex.exec(tag);
	}
	return attrs;
}

function parseTags(html, tagName) {
	const tagRegex = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
	const tags = html.match(tagRegex) ?? [];
	return tags.map((tag) => parseAttributes(tag));
}

function findTag(tags, attrName, attrValue) {
	return tags.find((tag) => tag[attrName] === attrValue) ?? null;
}

describe("index meta tags", () => {
	it("includes required Open Graph and Twitter tags", () => {
		const html = readFileSync(resolve(process.cwd(), "docs/index.html"), "utf8");
		const metas = parseTags(html, "meta");
		const links = parseTags(html, "link");

		const description = findTag(metas, "name", "description");
		expect(description?.content).toBe(META_DESCRIPTION);

		const ogTitle = findTag(metas, "property", "og:title");
		expect(ogTitle?.content).toBe(META_TITLE);

		const ogDescription = findTag(metas, "property", "og:description");
		expect(ogDescription?.content).toBe(META_DESCRIPTION);

		const ogType = findTag(metas, "property", "og:type");
		expect(ogType?.content).toBe("website");

		const ogUrl = findTag(metas, "property", "og:url");
		expect(ogUrl?.content).toBe(META_URL);

		const ogSiteName = findTag(metas, "property", "og:site_name");
		expect(ogSiteName?.content).toBe("Sheets & Sorcery");

		const ogImage = findTag(metas, "property", "og:image");
		expect(ogImage?.content).toBe(META_IMAGE);

		const ogImageType = findTag(metas, "property", "og:image:type");
		expect(ogImageType?.content).toBe("image/png");

		const ogImageWidth = findTag(metas, "property", "og:image:width");
		expect(ogImageWidth?.content).toBe("1536");

		const ogImageHeight = findTag(metas, "property", "og:image:height");
		expect(ogImageHeight?.content).toBe("1024");

		const ogImageAlt = findTag(metas, "property", "og:image:alt");
		expect(ogImageAlt?.content).toBe(META_IMAGE_ALT);

		const twitterCard = findTag(metas, "name", "twitter:card");
		expect(twitterCard?.content).toBe("summary_large_image");

		const twitterTitle = findTag(metas, "name", "twitter:title");
		expect(twitterTitle?.content).toBe(META_TITLE);

		const twitterDescription = findTag(metas, "name", "twitter:description");
		expect(twitterDescription?.content).toBe(META_DESCRIPTION);

		const twitterImage = findTag(metas, "name", "twitter:image");
		expect(twitterImage?.content).toBe(META_IMAGE);

		const twitterImageAlt = findTag(metas, "name", "twitter:image:alt");
		expect(twitterImageAlt?.content).toBe(META_IMAGE_ALT);

		const canonical = findTag(links, "rel", "canonical");
		expect(canonical?.href).toBe(META_URL);
	});
});
