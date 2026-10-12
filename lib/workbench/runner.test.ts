import { describe, it, expect } from "vitest";
import { pickAllowedModel } from "./runner";

describe("pickAllowedModel", () => {
  it("沒有白名單時沿用偏好", () => {
    expect(pickAllowedModel("pro", "flash", null)).toBe("pro");
  });
  it("偏好在白名單內就用偏好", () => {
    expect(pickAllowedModel("pro", "flash", ["flash", "pro"])).toBe("pro");
  });
  it("偏好被禁止時改用伺服器預設", () => {
    expect(pickAllowedModel("pro", "flash", ["flash", "lite"])).toBe("flash");
  });
  it("連預設也被禁止時用白名單第一個", () => {
    expect(pickAllowedModel("pro", "flash", ["lite"])).toBe("lite");
  });
});
