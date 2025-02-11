import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";
import { DaoCharterErrCode } from "../../error-codes";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const contractName = "aibtc-dao-charter-set-dao-charter";
const contractAddress = `${deployer}.${contractName}`;

const expectedError = DaoCharterErrCode.ERR_NOT_DAO_OR_EXTENSION;

describe(`core proposal: ${contractName}`, () => {
  it("execute() fails if called directly", () => {
    const receipt = simnet.callPublicFn(
      contractAddress,
      "execute",
      [Cl.principal(deployer)],
      deployer
    );
    expect(receipt.result).toBeErr(Cl.uint(expectedError));
  });
});
