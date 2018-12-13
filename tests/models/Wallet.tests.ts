import { Wallet } from "../../api/models";

describe("api.models.Wallet", () => {
  it("should initialize a new wallet", () => {
    const wallet = new Wallet({ owner: "luis" });

    expect(wallet).toHaveProperty("owner");
    expect(wallet.owner).toBe("luis");
  });
});
