import { isVersionNewer, isVersionCriticallyOutdated } from "../hook/useForceUpdate";

describe("isVersionNewer", () => {
  it("returns true when latest is greater (major)", () => {
    expect(isVersionNewer("2.0.0", "1.9.9")).toBe(true);
  });

  it("returns true when latest is greater (minor)", () => {
    expect(isVersionNewer("1.2.0", "1.1.9")).toBe(true);
  });

  it("returns true when latest is greater (patch)", () => {
    expect(isVersionNewer("1.0.1", "1.0.0")).toBe(true);
  });

  it("returns false when equal", () => {
    expect(isVersionNewer("1.2.0", "1.2.0")).toBe(false);
    expect(isVersionNewer("1.2", "1.2.0")).toBe(false);
  });

  it("returns false when latest is smaller", () => {
    expect(isVersionNewer("1.1.9", "1.2.0")).toBe(false);
  });
});

describe("isVersionCriticallyOutdated", () => {
  it("returns true when 2+ patch versions behind", () => {
    expect(isVersionCriticallyOutdated("1.0.3", "1.0.1")).toBe(true);
    expect(isVersionCriticallyOutdated("1.0.5", "1.0.0")).toBe(true);
  });

  it("returns false when only 1 patch version behind", () => {
    expect(isVersionCriticallyOutdated("1.0.2", "1.0.1")).toBe(false);
    expect(isVersionCriticallyOutdated("1.0.1", "1.0.0")).toBe(false);
  });

  it("returns true when 2+ minor versions behind", () => {
    expect(isVersionCriticallyOutdated("1.3.0", "1.1.0")).toBe(true);
    expect(isVersionCriticallyOutdated("1.5.0", "1.0.0")).toBe(true);
  });

  it("returns false when only 1 minor version behind", () => {
    expect(isVersionCriticallyOutdated("1.2.0", "1.1.0")).toBe(false);
  });

  it("returns true when major version is different", () => {
    expect(isVersionCriticallyOutdated("2.0.0", "1.9.9")).toBe(true);
    expect(isVersionCriticallyOutdated("3.0.0", "2.0.0")).toBe(true);
  });

  it("returns false when versions are equal", () => {
    expect(isVersionCriticallyOutdated("1.0.0", "1.0.0")).toBe(false);
  });
});


