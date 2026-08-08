import { issuedBeforePasswordChange } from "./jwt.strategy";

const at = (iso: string) => new Date(iso);
const secondsAt = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe("issuedBeforePasswordChange", () => {
  it("accepts any token when the password was never changed", () => {
    expect(
      issuedBeforePasswordChange(secondsAt("2026-08-08T10:00:00Z"), null),
    ).toBe(false);
  });

  it("rejects a token minted before the password changed", () => {
    expect(
      issuedBeforePasswordChange(
        secondsAt("2026-08-08T09:59:59Z"),
        at("2026-08-08T10:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("accepts a token minted after the password changed", () => {
    expect(
      issuedBeforePasswordChange(
        secondsAt("2026-08-08T10:00:01Z"),
        at("2026-08-08T10:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("accepts a token minted in the same second as the change", () => {
    // `iat` is floored to the second. Comparing it against the raw millisecond
    // timestamp would lock the user out of the token they just signed in with.
    expect(
      issuedBeforePasswordChange(
        secondsAt("2026-08-08T10:00:00Z"),
        at("2026-08-08T10:00:00.500Z"),
      ),
    ).toBe(false);
  });

  it("rejects a token with no issued-at claim once a change exists", () => {
    expect(
      issuedBeforePasswordChange(undefined, at("2026-08-08T10:00:00Z")),
    ).toBe(true);
  });
});
