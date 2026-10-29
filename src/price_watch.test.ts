import test from "node:test";
import assert from "node:assert/strict";
import { decideNotification } from "./price_watch.ts";

test("a lower observed catalog price creates a care-team notification decision", () => {
  assert.equal(decideNotification(12000, 11000), true);
  assert.equal(decideNotification(12000, 12000), false);
});
