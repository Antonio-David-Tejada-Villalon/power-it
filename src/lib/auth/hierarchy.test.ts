import { describe, it, expect } from "vitest";
import {
  manageableRoles,
  canManageRole,
  directManagerRole,
  canReviewRequest,
} from "@/lib/auth/hierarchy";

describe("manageableRoles / canManageRole", () => {
  it("admin administra todos los roles", () => {
    expect(manageableRoles("admin")).toEqual(["admin", "supervisor", "encargado", "operario", "cliente"]);
    expect(canManageRole("admin", "supervisor")).toBe(true);
  });

  it("supervisor administra encargado y operario, no admin ni otro supervisor", () => {
    expect(manageableRoles("supervisor")).toEqual(["encargado", "operario"]);
    expect(canManageRole("supervisor", "encargado")).toBe(true);
    expect(canManageRole("supervisor", "operario")).toBe(true);
    expect(canManageRole("supervisor", "admin")).toBe(false);
    expect(canManageRole("supervisor", "supervisor")).toBe(false);
  });

  it("encargado administra solo operario", () => {
    expect(manageableRoles("encargado")).toEqual(["operario"]);
    expect(canManageRole("encargado", "supervisor")).toBe(false);
  });

  it("operario y cliente no administran a nadie", () => {
    expect(manageableRoles("operario")).toEqual([]);
    expect(manageableRoles("cliente")).toEqual([]);
  });
});

describe("directManagerRole", () => {
  it("refleja la cadena admin > supervisor > encargado > operario", () => {
    expect(directManagerRole("supervisor")).toBe("admin");
    expect(directManagerRole("encargado")).toBe("supervisor");
    expect(directManagerRole("operario")).toBe("encargado");
  });

  it("admin y cliente no tienen gerente (tope/fuera de la cadena)", () => {
    expect(directManagerRole("admin")).toBeNull();
    expect(directManagerRole("cliente")).toBeNull();
  });
});

describe("canReviewRequest", () => {
  it("admin siempre puede revisar cualquier solicitud", () => {
    expect(canReviewRequest({ role: "admin", id: "admin-1" }, "supervisor", "sup-1", "sup-1")).toBe(true);
    expect(canReviewRequest({ role: "admin", id: "admin-1" }, "operario", "op-1", "op-1")).toBe(true);
  });

  it("encargado puede revisar una solicitud de un operario", () => {
    expect(canReviewRequest({ role: "encargado", id: "enc-1" }, "operario", "op-1", "op-1")).toBe(true);
  });

  it("supervisor puede revisar solicitudes de encargado y de operario", () => {
    expect(canReviewRequest({ role: "supervisor", id: "sup-1" }, "encargado", "enc-1", "enc-1")).toBe(true);
    expect(canReviewRequest({ role: "supervisor", id: "sup-1" }, "operario", "op-1", "op-1")).toBe(true);
  });

  it("un rol no puede revisar solicitudes fuera de su jerarquía", () => {
    expect(canReviewRequest({ role: "encargado", id: "enc-1" }, "supervisor", "sup-1", "sup-1")).toBe(false);
    expect(canReviewRequest({ role: "operario", id: "op-1" }, "operario", "op-2", "op-2")).toBe(false);
  });

  it("encargado no puede autoaprobar su propia solicitud (no existe ese privilegio para su rol)", () => {
    expect(canReviewRequest({ role: "encargado", id: "enc-1" }, "encargado", "enc-1", "enc-1")).toBe(false);
  });

  it("supervisor NO puede autoaprobar su propia solicitud sin el privilegio otorgado", () => {
    expect(
      canReviewRequest(
        { role: "supervisor", id: "sup-1", canApproveOwnEdits: false },
        "supervisor",
        "sup-1",
        "sup-1"
      )
    ).toBe(false);
  });

  it("supervisor SÍ puede autoaprobar su propia solicitud con el privilegio otorgado", () => {
    expect(
      canReviewRequest(
        { role: "supervisor", id: "sup-1", canApproveOwnEdits: true },
        "supervisor",
        "sup-1",
        "sup-1"
      )
    ).toBe(true);
  });

  // Regresión: se encontró y corrigió durante el desarrollo. El privilegio
  // de autoaprobación de un supervisor solo debe aplicar cuando el cambio es
  // sobre su PROPIA cuenta (requestedBy === target). Si el supervisor edita
  // a un subordinado (encargado/operario), sigue siendo requestedBy=sup-1,
  // pero el target NO es él mismo — antes de la corrección, esto se
  // confundía con un autoaprobado y el privilegio se colaba indebidamente.
  it("el privilegio de autoaprobación de un supervisor NO aplica cuando edita a un subordinado", () => {
    expect(
      canReviewRequest(
        { role: "supervisor", id: "sup-1", canApproveOwnEdits: true },
        "supervisor",
        "sup-1",
        "encargado-target-id"
      )
    ).toBe(false);
  });
});
