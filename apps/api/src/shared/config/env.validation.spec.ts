import { Logger } from "@nestjs/common";
import { validate } from "./env.validation";

const base = {
  DATABASE_URL: "mysql://root:sgm@localhost:3306/sgm",
  JWT_SECRET: "secret",
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
      /DATABASE_URL, JWT_SECRET/,
    );
  });

  it("treats a blank value as missing", () => {
    expect(() =>
      validate({ ...base, JWT_SECRET: "   ", STORAGE_DRIVER: "local" }),
    ).toThrow(/JWT_SECRET/);
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
});
