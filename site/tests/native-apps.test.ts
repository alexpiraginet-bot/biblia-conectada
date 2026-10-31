import { describe, expect, it } from "vitest";
import { appleStoreId, nativeAppLinks } from "../src/lib/native-apps";

const ios = "https://apps.apple.com/br/app/biblia-conectada/id123456789";
const android = "https://play.google.com/store/apps/details?id=company.bibliaconectada.app";

describe("native store release switches", () => {
  it("does not announce unreleased apps merely because their URL exists", () => {
    expect(nativeAppLinks({})).toEqual({ ios: null, android: null });
    expect(nativeAppLinks({ IOS_APP_STORE_URL: ios, ANDROID_PLAY_STORE_URL: android })).toEqual({ ios: null, android: null });
    expect(nativeAppLinks({ IOS_APP_AVAILABLE: "false", IOS_APP_STORE_URL: ios, ANDROID_APP_AVAILABLE: "1", ANDROID_PLAY_STORE_URL: android })).toEqual({ ios: null, android: null });
  });

  it("releases each platform independently and extracts the public App Store id", () => {
    expect(nativeAppLinks({ IOS_APP_AVAILABLE: "true", IOS_APP_STORE_URL: ios })).toEqual({ ios, android: null });
    expect(nativeAppLinks({ ANDROID_APP_AVAILABLE: "true", ANDROID_PLAY_STORE_URL: android })).toEqual({ ios: null, android });
    expect(appleStoreId(ios)).toBe("123456789");
    expect(appleStoreId(null)).toBeNull();
    expect(appleStoreId("not-a-url")).toBeNull();
    const accented = "https://apps.apple.com/br/app/b%C3%ADblia-conectada/id123456789";
    expect(nativeAppLinks({ IOS_APP_AVAILABLE: "true", IOS_APP_STORE_URL: accented }).ios).toBe(accented);
  });

  it.each([
    "http://apps.apple.com/br/app/id123456789", "https://apps.apple.com.evil.test/app/id123456789",
    "https://user:password@apps.apple.com/app/id123456789", "https://apps.apple.com/app/id0",
    "https://apps.apple.com/app/no-id", "https://apps.apple.com/app/id123456789#payload",
    "https://apps.apple.com:8443/app/id123456789", "itms-apps://apps.apple.com/app/id123456789",
  ])("rejects invalid iOS store address %s", (url) => {
    expect(nativeAppLinks({ IOS_APP_AVAILABLE: "true", IOS_APP_STORE_URL: url }).ios).toBeNull();
  });

  it.each([
    "https://play.google.com.evil.test/store/apps/details?id=company.bible",
    "https://play.google.com/store/apps/details?id=company.bible&id=other.app",
    "https://play.google.com/store/apps/details?id=package", "https://play.google.com/store/apps/details?id=1.test",
    "https://user:password@play.google.com/store/apps/details?id=company.bible",
    "http://play.google.com/store/apps/details?id=company.bible",
  ])("rejects invalid Android store address %s", (url) => {
    expect(nativeAppLinks({ ANDROID_APP_AVAILABLE: "true", ANDROID_PLAY_STORE_URL: url }).android).toBeNull();
  });

  it("does not forward campaign data or arbitrary store query parameters", () => {
    expect(nativeAppLinks({ ANDROID_APP_AVAILABLE: "true", ANDROID_PLAY_STORE_URL: `${android}&referrer=private&token=secret` }).android).toBe(android);
  });
});
