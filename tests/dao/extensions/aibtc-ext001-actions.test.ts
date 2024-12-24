import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const addressDeployer = accounts.get("deployer")!;

const contractAddress = `${addressDeployer}.aibtc-ext001-actions`;

enum ErrCode {
  ERR_UNAUTHORIZED = 1000,
  ERR_NOT_DAO_OR_EXTENSION,

  ERR_NOT_INITIALIZED = 1100,
  ERR_ALREADY_INITIALIZED,

  ERR_TREASURY_MUST_BE_CONTRACT = 1200,
  ERR_TREASURY_CANNOT_BE_SELF,
  ERR_TREASURY_ALREADY_SET,
  ERR_TREASURY_MISMATCH,

  ERR_TOKEN_MUST_BE_CONTRACT = 1300,
  ERR_TOKEN_NOT_INITIALIZED,
  ERR_TOKEN_MISMATCH,
  ERR_INSUFFICIENT_BALANCE,

  ERR_PROPOSAL_NOT_FOUND = 1400,
  ERR_PROPOSAL_ALREADY_EXECUTED,
  ERR_PROPOSAL_STILL_ACTIVE,
  ERR_SAVING_PROPOSAL,
  ERR_PROPOSAL_ALREADY_CONCLUDED,

  ERR_VOTE_TOO_SOON = 1500,
  ERR_VOTE_TOO_LATE,
  ERR_ALREADY_VOTED,
  ERR_ZERO_VOTING_POWER,
  ERR_QUORUM_NOT_REACHED,

  ERR_INVALID_ACTION = 1600,
  ERR_INVALID_PARAMETERS,
}

describe("aibtc-ext001-actions", () => {
  // Protocol Treasury Tests
  describe("set-protocol-treasury()", () => {
    it("fails if caller is not DAO or extension", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-protocol-treasury",
        [Cl.contractPrincipal(addressDeployer, "test-treasury")],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_UNAUTHORIZED));
    });

    it("fails if treasury is not a contract", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-protocol-treasury",
        [Cl.standardPrincipal(address1)],
        addressDeployer
      );
      expect(receipt.result).toBeErr(
        Cl.uint(ErrCode.ERR_TREASURY_MUST_BE_CONTRACT)
      );
    });

    it("fails if treasury is self", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-protocol-treasury",
        [Cl.contractPrincipal(addressDeployer, "aibtc-ext001-actions")],
        addressDeployer
      );
      expect(receipt.result).toBeErr(
        Cl.uint(ErrCode.ERR_TREASURY_CANNOT_BE_SELF)
      );
    });

    it("fails if treasury is already set", () => {
      // First set the treasury
      simnet.callPublicFn(
        contractAddress,
        "set-protocol-treasury",
        [Cl.contractPrincipal(addressDeployer, "test-treasury")],
        addressDeployer
      );

      // Try to set it to the same value
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-protocol-treasury",
        [Cl.contractPrincipal(addressDeployer, "test-treasury")],
        addressDeployer
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_TREASURY_ALREADY_SET));
    });

    it("succeeds and sets new treasury", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-protocol-treasury",
        [Cl.contractPrincipal(addressDeployer, "test-treasury")],
        addressDeployer
      );
      expect(receipt.result).toBeOk(Cl.bool(true));

      // Verify treasury was set
      const getReceipt = simnet.callReadOnlyFn(
        contractAddress,
        "get-protocol-treasury",
        [],
        addressDeployer
      );
      expect(getReceipt.result).toBeOk(
        Cl.some(Cl.contractPrincipal(addressDeployer, "test-treasury"))
      );
    });
  });

  // Voting Token Tests
  describe("set-voting-token()", () => {
    it("fails if caller is not DAO or extension", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-voting-token",
        [Cl.contractPrincipal(addressDeployer, "test-token")],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_UNAUTHORIZED));
    });

    it("fails if token is not a contract", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-voting-token",
        [Cl.standardPrincipal(address1)],
        addressDeployer
      );
      expect(receipt.result).toBeErr(
        Cl.uint(ErrCode.ERR_TOKEN_MUST_BE_CONTRACT)
      );
    });

    it("fails if token is not initialized", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-voting-token",
        [Cl.contractPrincipal(addressDeployer, "test-token")],
        addressDeployer
      );
      expect(receipt.result).toBeErr(
        Cl.uint(ErrCode.ERR_TOKEN_NOT_INITIALIZED)
      );
    });

    it("fails if token mismatches", () => {
      // First initialize the token
      simnet.callPublicFn(
        contractAddress,
        "set-voting-token",
        [Cl.contractPrincipal(addressDeployer, "test-token")],
        addressDeployer
      );

      // Try to set a different token
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-voting-token",
        [Cl.contractPrincipal(addressDeployer, "different-token")],
        addressDeployer
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_TOKEN_MISMATCH));
    });

    it("succeeds and sets new token", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "set-voting-token",
        [Cl.contractPrincipal(addressDeployer, "test-token")],
        addressDeployer
      );
      expect(receipt.result).toBeOk(Cl.bool(true));

      // Verify token was set
      const getReceipt = simnet.callReadOnlyFn(
        contractAddress,
        "get-voting-token",
        [],
        addressDeployer
      );
      expect(getReceipt.result).toBeOk(
        Cl.some(Cl.contractPrincipal(addressDeployer, "test-token"))
      );
    });
  });

  // Proposal Tests
  describe("propose-action()", () => {
    it("fails if contract not initialized", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "propose-action",
        [
          Cl.stringAscii("send-message"),
          Cl.list([Cl.stringUtf8("Hello World")]),
          Cl.contractPrincipal(addressDeployer, "test-token")
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_NOT_INITIALIZED));
    });

    it("fails if token mismatches", () => {
      // First set the treasury and token
      simnet.callPublicFn(
        contractAddress,
        "set-protocol-treasury",
        [Cl.contractPrincipal(addressDeployer, "test-treasury")],
        addressDeployer
      );

      simnet.callPublicFn(
        contractAddress,
        "set-voting-token",
        [Cl.contractPrincipal(addressDeployer, "test-token")],
        addressDeployer
      );

      const receipt = simnet.callPublicFn(
        contractAddress,
        "propose-action",
        [
          Cl.stringAscii("send-message"),
          Cl.list([Cl.stringUtf8("Hello World")]),
          Cl.contractPrincipal(addressDeployer, "wrong-token")
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_TOKEN_MISMATCH));
    });

    it("fails if caller has no balance", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "propose-action",
        [
          Cl.stringAscii("send-message"),
          Cl.list([Cl.stringUtf8("Hello World")]),
          Cl.contractPrincipal(addressDeployer, "test-token")
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_INSUFFICIENT_BALANCE));
    });

    it("succeeds and creates new proposal", () => {
      // Mock some balance for the caller
      simnet.mineBlock([
        simnet.callPublicFn(
          `${addressDeployer}.test-token`,
          "mint",
          [
            Cl.uint(1000000),
            Cl.standardPrincipal(address1)
          ],
          addressDeployer
        )
      ]);

      const receipt = simnet.callPublicFn(
        contractAddress,
        "propose-action",
        [
          Cl.stringAscii("send-message"),
          Cl.list([Cl.stringUtf8("Hello World")]),
          Cl.contractPrincipal(addressDeployer, "test-token")
        ],
        address1
      );
      expect(receipt.result).toBeOk(Cl.uint(1));

      // Verify proposal was created
      const getReceipt = simnet.callReadOnlyFn(
        contractAddress,
        "get-total-proposals",
        [],
        addressDeployer
      );
      expect(getReceipt.result).toBeOk(Cl.uint(1));
    });
  });

  // Voting Tests
  describe("vote-on-proposal()", () => {
    it("fails if contract not initialized", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "vote-on-proposal",
        [
          Cl.uint(1),
          Cl.contractPrincipal(addressDeployer, "test-token"),
          Cl.bool(true)
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_NOT_INITIALIZED));
    });

    it("fails if token mismatches", () => {
      // First set the treasury and token
      simnet.callPublicFn(
        contractAddress,
        "set-protocol-treasury",
        [Cl.contractPrincipal(addressDeployer, "test-treasury")],
        addressDeployer
      );

      simnet.callPublicFn(
        contractAddress,
        "set-voting-token",
        [Cl.contractPrincipal(addressDeployer, "test-token")],
        addressDeployer
      );

      const receipt = simnet.callPublicFn(
        contractAddress,
        "vote-on-proposal",
        [
          Cl.uint(1),
          Cl.contractPrincipal(addressDeployer, "wrong-token"),
          Cl.bool(true)
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_TOKEN_MISMATCH));
    });

    it("fails if caller has no balance", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "vote-on-proposal",
        [
          Cl.uint(1),
          Cl.contractPrincipal(addressDeployer, "test-token"),
          Cl.bool(true)
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_INSUFFICIENT_BALANCE));
    });

    it("fails if voting too soon", () => {
      // Mock some balance for the caller
      simnet.mineBlock([
        simnet.callPublicFn(
          `${addressDeployer}.test-token`,
          "mint",
          [
            Cl.uint(1000000),
            Cl.standardPrincipal(address1)
          ],
          addressDeployer
        )
      ]);

      // Create a proposal
      simnet.callPublicFn(
        contractAddress,
        "propose-action",
        [
          Cl.stringAscii("send-message"),
          Cl.list([Cl.stringUtf8("Hello World")]),
          Cl.contractPrincipal(addressDeployer, "test-token")
        ],
        address1
      );

      // Try to vote before start block
      const receipt = simnet.callPublicFn(
        contractAddress,
        "vote-on-proposal",
        [
          Cl.uint(1),
          Cl.contractPrincipal(addressDeployer, "test-token"),
          Cl.bool(true)
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_VOTE_TOO_SOON));
    });

    it("fails if voting too late", () => {
      // Mine blocks past the voting period
      simnet.mineEmptyBlocks(145);

      const receipt = simnet.callPublicFn(
        contractAddress,
        "vote-on-proposal",
        [
          Cl.uint(1),
          Cl.contractPrincipal(addressDeployer, "test-token"),
          Cl.bool(true)
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_VOTE_TOO_LATE));
    });

    it("fails if proposal concluded", () => {
      // Conclude the proposal
      simnet.callPublicFn(
        contractAddress,
        "conclude-proposal",
        [
          Cl.uint(1),
          Cl.contractPrincipal(addressDeployer, "test-treasury"),
          Cl.contractPrincipal(addressDeployer, "test-token")
        ],
        address1
      );

      const receipt = simnet.callPublicFn(
        contractAddress,
        "vote-on-proposal",
        [
          Cl.uint(1),
          Cl.contractPrincipal(addressDeployer, "test-token"),
          Cl.bool(true)
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_PROPOSAL_ALREADY_CONCLUDED));
    });

    it("fails if already voted", () => {
      // Create a new proposal
      simnet.callPublicFn(
        contractAddress,
        "propose-action",
        [
          Cl.stringAscii("send-message"),
          Cl.list([Cl.stringUtf8("Hello World")]),
          Cl.contractPrincipal(addressDeployer, "test-token")
        ],
        address1
      );

      // Vote once
      simnet.callPublicFn(
        contractAddress,
        "vote-on-proposal",
        [
          Cl.uint(2),
          Cl.contractPrincipal(addressDeployer, "test-token"),
          Cl.bool(true)
        ],
        address1
      );

      // Try to vote again
      const receipt = simnet.callPublicFn(
        contractAddress,
        "vote-on-proposal",
        [
          Cl.uint(2),
          Cl.contractPrincipal(addressDeployer, "test-token"),
          Cl.bool(true)
        ],
        address1
      );
      expect(receipt.result).toBeErr(Cl.uint(ErrCode.ERR_ALREADY_VOTED));
    });

    it("succeeds and records vote", () => {
      const receipt = simnet.callPublicFn(
        contractAddress,
        "vote-on-proposal",
        [
          Cl.uint(2),
          Cl.contractPrincipal(addressDeployer, "test-token"),
          Cl.bool(true)
        ],
        address2
      );
      expect(receipt.result).toBeOk(Cl.bool(true));

      // Verify vote was recorded
      const getReceipt = simnet.callReadOnlyFn(
        contractAddress,
        "get-total-votes",
        [
          Cl.uint(2),
          Cl.standardPrincipal(address2)
        ],
        addressDeployer
      );
      expect(getReceipt.result).toBeOk(Cl.uint(1000000));
    });
  });

  // Conclusion Tests
  describe("conclude-proposal()", () => {
    it("fails if contract not initialized");
    it("fails if treasury mismatches");
    it("fails if proposal still active");
    it("fails if proposal already concluded");
    it("succeeds and executes if passed");
    it("succeeds without executing if failed");
  });
});
