import { describe, expect, it } from "vitest";

import { enabledOAuthProviders } from "./providers";

describe("enabledOAuthProviders", () => {
  it("parses a comma list, ignoring case, spaces and unknown names", () => {
    expect(enabledOAuthProviders("Google, apple ,facebook")).toEqual(["google", "apple"]);
  });
  it("is empty when unset", () => {
    expect(enabledOAuthProviders(undefined)).toEqual([]);
    expect(enabledOAuthProviders("")).toEqual([]);
  });
});
