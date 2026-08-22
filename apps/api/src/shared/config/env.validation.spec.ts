import { Logger } from "@nestjs/common";
import { normalizeSupabaseUrl, validate } from "./env.validation";

const base = {
  DATABASE_URL: "mysql://root:sgm@localhost:3306/sgm",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

describe("validate", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("accepts the local driver with only the base variables", () => {
    expect(() => validate({ ...base, STORAGE_DRIVER: "local" })).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it("lists every missing required variable in one error", () => {
    expect(() => validate({ STORAGE_DRIVER: "local" })).toThrow(
      /DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it("treats a blank value as missing", () => {
    expect(() =>
      validate({
        ...base,
        SUPABASE_SERVICE_ROLE_KEY: "   ",
        STORAGE_DRIVER: "local",
      }),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("warns but does not throw when the r2 credentials are absent", () => {
    expect(() => validate(base)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("AWS_SECRET_ACCESS_KEY"),
    );
  });

  it("stays quiet once the r2 credentials are present", () => {
    expect(() =>
      validate({
        ...base,
        R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
        R2_PUBLIC_URL: "https://files.example.com/",
        AWS_ACCESS_KEY_ID: "key",
        AWS_SECRET_ACCESS_KEY: "secret",
      }),
    ).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns about an unknown driver instead of blocking the boot", () => {
    expect(() => validate({ ...base, STORAGE_DRIVER: "s3" })).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('STORAGE_DRIVER="s3"'),
    );
  });

  it("hands the normalized supabase url back to the config", () => {
    const config = validate({
      ...base,
      SUPABASE_URL: " https://project.supabase.co/ ",
      STORAGE_DRIVER: "local",
    });

    expect(config.SUPABASE_URL).toBe("https://project.supabase.co");
  });
});

/**
 * A trailing slash here yields an issuer that does not match the token's `iss`,
 * and the only symptom is 401 on every request with nothing naming the cause.
 */
describe("normalizeSupabaseUrl", () => {
  it("strips a trailing slash and surrounding whitespace", () => {
    expect(normalizeSupabaseUrl("  https://project.supabase.co/  ")).toBe(
      "https://project.supabase.co",
    );
  });

  it("leaves an already clean url alone", () => {
    expect(normalizeSupabaseUrl("https://project.supabase.co")).toBe(
      "https://project.supabase.co",
    );
  });

  it("rejects a value that is not a url", () => {
    expect(() => normalizeSupabaseUrl("project.supabase.co")).toThrow(
      /não é uma URL válida/,
    );
  });

  it("rejects plain http on a remote host", () => {
    expect(() => normalizeSupabaseUrl("http://project.supabase.co")).toThrow(
      /https/,
    );
  });

  it("allows http on localhost, for a self-hosted stack", () => {
    expect(normalizeSupabaseUrl("http://localhost:54321")).toBe(
      "http://localhost:54321",
    );
  });

  it("rejects a url carrying a path, which would double up on /auth/v1", () => {
    expect(() =>
      normalizeSupabaseUrl("https://project.supabase.co/auth/v1"),
    ).toThrow(/caminho/);
  });
});
