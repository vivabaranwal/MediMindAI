import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { ApiError, toApiError } from "@/lib/errors";
import { acuityToRisk, acuityToTriage, riskToAcuity, triageToAcuity } from "@/lib/risk";

function axiosError(status: number | null, body?: unknown) {
  const err = new AxiosError("Request failed");
  if (status !== null) {
    err.response = { status, data: body, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } };
  }
  return err;
}

describe("toApiError", () => {
  it("maps known backend codes to clinician-friendly messages", () => {
    const e = toApiError(axiosError(403, { code: "ai_consent_required", message: "raw" }));
    expect(e.code).toBe("ai_consent_required");
    expect(e.status).toBe(403);
    expect(e.message).toMatch(/consent/i);
    expect(e.message).not.toBe("raw");
  });

  it("surfaces the first Laravel validation message", () => {
    const e = toApiError(axiosError(422, { message: "The given data was invalid.", errors: { mobile: ["The mobile has already been taken."] } }));
    expect(e.message).toBe("The mobile has already been taken.");
  });

  it("falls back to the server message, then to the caller's fallback", () => {
    expect(toApiError(axiosError(500, { message: "Boom" })).message).toBe("Boom");
    expect(toApiError(axiosError(500, {}), "Custom fallback").message).toBe("Custom fallback");
  });

  it("reports an unreachable server when there is no response", () => {
    expect(toApiError(axiosError(null)).message).toMatch(/cannot reach the server/i);
  });

  it("passes ApiError through and wraps plain errors", () => {
    const original = new ApiError("x", "code", 400);
    expect(toApiError(original)).toBe(original);
    expect(toApiError(new Error("plain")).message).toBe("plain");
  });
});

describe("risk mapping", () => {
  it("round-trips API risk and UI acuity", () => {
    for (const risk of ["low", "medium", "high", "critical"] as const) {
      expect(acuityToRisk(riskToAcuity(risk))).toBe(risk);
    }
  });

  it("maps acuity to the triage colour stored in the database and back", () => {
    expect(acuityToTriage("emergent acuity")).toBe("red");
    expect(acuityToTriage("low acuity")).toBe("green");
    expect(triageToAcuity("amber")).toBe("high acuity");
    expect(triageToAcuity("orange")).toBe("high acuity");
  });

  it("treats unknown triage as low acuity rather than inventing urgency", () => {
    expect(triageToAcuity(undefined)).toBe("low acuity");
    expect(triageToAcuity("purple")).toBe("low acuity");
  });
});
