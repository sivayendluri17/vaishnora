// Route tests for the admin product and order APIs: a vendor sees and edits
// only their own products, never another vendor's, and never the full order
// list; an owner sees everything.
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@vaishnora/core/admin", () => ({ getAdminUser: vi.fn(), getOwnerUser: vi.fn() }));
vi.mock("@vaishnora/core/revalidate", () => ({ revalidateStorefront: vi.fn(async () => {}) }));
vi.mock("@vaishnora/core/orders", () => ({ listOrders: vi.fn(async () => []) }));
vi.mock("@vaishnora/core/products-db", () => ({
  listAllProducts: vi.fn(async () => []),
  createProduct: vi.fn(async () => "new-id"),
  updateProduct: vi.fn(async () => {}),
  deleteProduct: vi.fn(async () => {}),
  productVendorId: vi.fn(),
  colourOnProduct: vi.fn(async () => true),
  imageOnProduct: vi.fn(async () => true),
  addColor: vi.fn(async () => {}),
  deleteColor: vi.fn(async () => {}),
  addImagesToColor: vi.fn(async () => {}),
  deleteImage: vi.fn(async () => {}),
  migrateLegacyImage: vi.fn(async () => {}),
  updateColor: vi.fn(async () => true),
  updateImageAngle: vi.fn(async () => true),
}));

import { getAdminUser, getOwnerUser } from "@vaishnora/core/admin";
import * as db from "@vaishnora/core/products-db";
import { GET as listProducts, POST as createProductRoute } from "../app/api/admin/products/route";
import { PATCH, DELETE } from "../app/api/admin/products/[id]/route";
import { GET as listOrdersRoute } from "../app/api/admin/orders/route";

const VENDOR = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Anitha", role: "vendor" as const };
const OWNER = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Siva", role: "owner" as const };
const PRODUCT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const params = { params: Promise.resolve({ id: PRODUCT }) };
const req = (method: string, body?: unknown) => new Request("http://test/api/admin/products", { method, body: body === undefined ? undefined : JSON.stringify(body) });
const colours = [{ name: "Red", swatch: "#c00", imageKeys: [{ key: "k1", angle: "front" }] }];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOwnerUser).mockImplementation(async () => (await getAdminUser())?.role === "owner" ? OWNER : null);
});

describe("catalog listing", () => {
  test("a vendor only gets their own products", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(VENDOR);
    expect((await listProducts()).status).toBe(200);
    expect(db.listAllProducts).toHaveBeenCalledWith({ vendorId: VENDOR.id });
  });

  test("an owner gets every product", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(OWNER);
    await listProducts();
    expect(db.listAllProducts).toHaveBeenCalledWith(undefined);
  });

  test("signed-out callers are refused", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(null);
    expect((await listProducts()).status).toBe(403);
  });
});

describe("creating products", () => {
  test("a vendor's new product is tagged with their id, an owner's stays house stock", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(VENDOR);
    const body = { name: "Kurti", category: "Dresses", price: 500, colors: colours };
    expect((await createProductRoute(req("POST", body))).status).toBe(200);
    expect(db.createProduct).toHaveBeenCalledWith(expect.objectContaining({ vendorId: VENDOR.id }));

    vi.mocked(getAdminUser).mockResolvedValue(OWNER);
    await createProductRoute(req("POST", body));
    expect(db.createProduct).toHaveBeenLastCalledWith(expect.objectContaining({ vendorId: null }));
  });
});

describe("editing and deleting", () => {
  test("a vendor cannot touch another vendor's product", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(VENDOR);
    vi.mocked(db.productVendorId).mockResolvedValue(OWNER.id);
    expect((await PATCH(req("PATCH", { price: 1 }), params)).status).toBe(403);
    expect((await DELETE(req("DELETE"), params)).status).toBe(403);
    expect(db.updateProduct).not.toHaveBeenCalled();
    expect(db.deleteProduct).not.toHaveBeenCalled();
  });

  test("a vendor cannot touch house stock either", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(VENDOR);
    vi.mocked(db.productVendorId).mockResolvedValue(null);
    expect((await PATCH(req("PATCH", { price: 1 }), params)).status).toBe(403);
  });

  test("a vendor edits their own product", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(VENDOR);
    vi.mocked(db.productVendorId).mockResolvedValue(VENDOR.id);
    expect((await PATCH(req("PATCH", { price: 750 }), params)).status).toBe(200);
    expect(db.updateProduct).toHaveBeenCalledWith(PRODUCT, expect.objectContaining({ price: 750 }));
  });

  test("an owner edits anything, and an unknown product is 404", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(OWNER);
    vi.mocked(db.productVendorId).mockResolvedValue(VENDOR.id);
    expect((await DELETE(req("DELETE"), params)).status).toBe(200);
    vi.mocked(db.productVendorId).mockResolvedValue(undefined);
    expect((await PATCH(req("PATCH", { price: 1 }), params)).status).toBe(404);
  });

  test("a colour or photo id from another product is refused", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(VENDOR);
    vi.mocked(db.productVendorId).mockResolvedValue(VENDOR.id);
    vi.mocked(db.colourOnProduct).mockResolvedValue(false);
    expect((await PATCH(req("PATCH", { deleteColorId: "someone-elses-colour" }), params)).status).toBe(404);
    expect(db.deleteColor).not.toHaveBeenCalled();
    vi.mocked(db.imageOnProduct).mockResolvedValue(false);
    expect((await PATCH(req("PATCH", { deleteImageId: "someone-elses-photo" }), params)).status).toBe(404);
    expect(db.deleteImage).not.toHaveBeenCalled();
  });
});

describe("orders", () => {
  test("the full order list is owners only", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(VENDOR);
    expect((await listOrdersRoute(new Request("http://test/api/admin/orders"))).status).toBe(403);
    vi.mocked(getAdminUser).mockResolvedValue(OWNER);
    expect((await listOrdersRoute(new Request("http://test/api/admin/orders"))).status).toBe(200);
  });
});
