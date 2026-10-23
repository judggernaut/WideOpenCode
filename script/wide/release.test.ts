import { expect, test } from "bun:test"
import { releasePlan } from "./release"

test.each([
  { version: "2.1.3", tags: ["v2.0.30-wide"], release: true },
  { version: "2.1.3", tags: ["v2.1.3-wide"], release: false },
  { version: "2.1.3", tags: ["v1.19.4", "v2.1.3"], release: true },
  { version: "2.1.4", tags: ["v2.1.3-wide"], release: true },
])("release decision for $version with $tags", ({ version, tags, release }) => {
  expect(releasePlan(version, tags)).toEqual({ version, tag: `v${version}-wide`, release })
})

test("manual tags use the same duplicate check", () => {
  expect(releasePlan("2.1.3", [], "v2.1.3-wide.1").release).toBe(true)
  expect(releasePlan("2.1.3", ["v2.1.3-wide.1"], "v2.1.3-wide.1").release).toBe(false)
})

test.each(["1.19.4", "2.1", "2.01.3", "2.1.3-beta", "2.1.3\nrelease=true", "", null, 2, {}])(
  "rejects invalid stable version %j",
  (version) => {
    expect(() => releasePlan(version, [])).toThrow("Expected a stable 2.x version")
  },
)

test.each(["v2.1.3-wide\nrelease=true", "../v2.1.3", 'v2.1.3";echo test', "-wide"])(
  "rejects invalid tag %j",
  (tag) => {
    expect(() => releasePlan("2.1.3", [], tag)).toThrow("Invalid release tag")
  },
)

test("automatically checks main pushes and successful syncs", async () => {
  const workflow = Bun.YAML.parse(
    await Bun.file(new URL("../../.github/workflows/wide-release.yml", import.meta.url)).text(),
  )
  expect(workflow.on.push.branches).toEqual(["main"])
  expect(workflow.on.workflow_run).toEqual({
    workflows: ["wide-sync"],
    branches: ["main"],
    types: ["completed"],
  })
  expect(workflow.concurrency).toEqual({ group: "wide-release", "cancel-in-progress": false })
})
