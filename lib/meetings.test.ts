import { describe, expect, it } from "vitest";

import { meetingImagePaths, ORG_CHART_TOKEN, parseAttendees, sheetMarkdown, splitSheetMarkdown, withImageUrls } from "@/lib/meetings";

describe("meeting markdown", () => {
  it("drops the number from a numbered section and demotes a plain one", () => {
    expect(sheetMarkdown("## 1. Causes\n## Decisions\ntext")).toBe("## Causes\n### Decisions\ntext");
  });

  it("reads the sign-in list one name per line", () => {
    expect(parseAttendees(" Ana \n\nBoris\r\n")).toEqual(["Ana", "Boris"]);
  });

  it("splits at the org chart line and keeps the prose around it", () => {
    const md = `## 3. Membership\n\nThe chart:\n\n  ${ORG_CHART_TOKEN}  \n\n- after`;
    expect(splitSheetMarkdown(md)).toEqual([
      { kind: "md", text: "## 3. Membership\n\nThe chart:" },
      { kind: "org-chart" },
      { kind: "md", text: "- after" },
    ]);
    expect(splitSheetMarkdown("plain")).toEqual([{ kind: "md", text: "plain" }]);
    expect(splitSheetMarkdown(ORG_CHART_TOKEN)).toEqual([{ kind: "org-chart" }]);
  });

  it("finds the bucket paths of pictures and leaves web images alone", () => {
    const md = "![Chart](abc-1/1.jpg) text ![](abc-1/2.png) ![again](abc-1/1.jpg) ![web](https://x.test/a.jpg)";
    expect(meetingImagePaths(md)).toEqual(["abc-1/1.jpg", "abc-1/2.png"]);
  });

  it("swaps a path for its URL and keeps a path it has no URL for", () => {
    const urls = new Map([["abc-1/1.jpg", "https://s.test/signed/1.jpg?token=t"]]);
    expect(withImageUrls("![Chart](abc-1/1.jpg) ![x](abc-1/2.png)", urls)).toBe("![Chart](https://s.test/signed/1.jpg?token=t) ![x](abc-1/2.png)");
  });
});
