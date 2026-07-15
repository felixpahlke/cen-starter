import { readFile } from "node:fs/promises";
import process from "node:process";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
if (pkg.cen?.finalized === false && !process.env.CEN_TEMPLATE_MAINTENANCE) {
  console.error(
    "\n✗ setup mode: this template is not finalized, and new migrations are feature work.\n" +
      "  Complete setup first — read .agents/skills/setup/SKILL.md. Finalizing removes this guard.\n" +
      "  Template maintainer? Re-run with CEN_TEMPLATE_MAINTENANCE=1.",
  );
  process.exit(1);
}
