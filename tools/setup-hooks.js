#!/usr/bin/env node

import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const gitDir = join(process.cwd(), ".git");
if (!existsSync(gitDir)) {
	process.exit(0);
}

const hooksDir = join(gitDir, "hooks");
if (!existsSync(hooksDir)) {
	mkdirSync(hooksDir, { recursive: true });
}

const hookPath = join(hooksDir, "pre-commit");
const hookBody = "#!/bin/sh\npnpm lint\n";

writeFileSync(hookPath, hookBody, { encoding: "utf8" });
chmodSync(hookPath, 0o755);
