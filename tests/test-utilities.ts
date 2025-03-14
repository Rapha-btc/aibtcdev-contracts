import {
  Cl,
  ClarityType,
  ClarityValue,
  cvToValue,
  TupleCV,
} from "@stacks/transactions";
import { expect } from "vitest";
import {
  ContractActionType,
  ContractNames,
  ContractType,
  VoteSettings,
  VotingConfig,
} from "./dao-types";
import { ClarityEvent } from "@hirosystems/clarinet-sdk";

// bigint replacer for json.stringify()
export function bigIntReplacer(_key: string, value: any) {
  typeof value === "bigint" ? value.toString() : value;
}

// voting configuration
export const VOTING_CONFIG: VotingConfig = {
  [ContractType.DAO_CORE_PROPOSALS]: {
    votingDelay: 0, // no delay
    votingPeriod: 144, // 144 Bitcoin blocks (~1 days)
    votingQuorum: 95, // 95% of liquid supply must participate
    votingThreshold: 95, // 95% of votes must be in favor
  },
  [ContractType.DAO_CORE_PROPOSALS_V2]: {
    votingDelay: 432, // 3 x 144 Bitcoin blocks (~3 days)
    votingPeriod: 432, // 3 x 144 Bitcoin blocks (~3 days)
    votingQuorum: 25, // 25% of liquid supply must participate
    votingThreshold: 90, // 90% of votes must be in favor
  },
  [ContractType.DAO_ACTION_PROPOSALS]: {
    votingDelay: 0, // no delay
    votingPeriod: 144, // 144 Bitcoin blocks (~1 days)
    votingQuorum: 66, // 66% of liquid supply must participate
    votingThreshold: 66, // 66% of votes must be in favor
  },
  [ContractType.DAO_ACTION_PROPOSALS_V2]: {
    votingDelay: 144, // 1 x 144 Bitcoin blocks (~3 days)
    votingPeriod: 288, // 2 x 144 Bitcoin blocks (~2 days)
    votingQuorum: 15, // 15% of liquid supply must participate
    votingThreshold: 66, // 66% of votes must be in favor
  },
};

export function generateContractNames(tokenSymbol: string): ContractNames {
  return {
    [ContractType.DAO_TOKEN]: `${tokenSymbol.toLowerCase()}-faktory`,
    [ContractType.DAO_BITFLOW_POOL]: `xyk-pool-stx-${tokenSymbol.toLowerCase()}-v-1-1`,
    [ContractType.DAO_TOKEN_DEX]: `${tokenSymbol.toLowerCase()}-faktory-dex`,
    [ContractType.DAO_TOKEN_OWNER]: `${tokenSymbol.toLowerCase()}-token-owner`,
    [ContractType.DAO_BASE]: `${tokenSymbol.toLowerCase()}-base-dao`,
    [ContractType.DAO_ACTION_PROPOSALS]: `${tokenSymbol.toLowerCase()}-action-proposals`,
    [ContractType.DAO_ACTION_PROPOSALS_V2]: `${tokenSymbol.toLowerCase()}-action-proposals-v2`,
    [ContractType.DAO_BANK_ACCOUNT]: `${tokenSymbol.toLowerCase()}-bank-account`,
    [ContractType.DAO_CHARTER]: `${tokenSymbol.toLowerCase()}-dao-charter`,
    [ContractType.DAO_CORE_PROPOSALS]: `${tokenSymbol.toLowerCase()}-core-proposals`,
    [ContractType.DAO_CORE_PROPOSALS_V2]: `${tokenSymbol.toLowerCase()}-core-proposals-v2`,
    [ContractType.DAO_MESSAGING]: `${tokenSymbol.toLowerCase()}-onchain-messaging`,
    [ContractType.DAO_PAYMENTS]: `${tokenSymbol.toLowerCase()}-payments-invoices`,
    [ContractType.DAO_TREASURY]: `${tokenSymbol.toLowerCase()}-treasury`,
    [ContractActionType.DAO_ACTION_ADD_RESOURCE]: `${tokenSymbol.toLowerCase()}-action-add-resource`,
    [ContractActionType.DAO_ACTION_ALLOW_ASSET]: `${tokenSymbol.toLowerCase()}-action-allow-asset`,
    [ContractActionType.DAO_ACTION_SEND_MESSAGE]: `${tokenSymbol.toLowerCase()}-action-send-message`,
    [ContractActionType.DAO_ACTION_SET_ACCOUNT_HOLDER]: `${tokenSymbol.toLowerCase()}-action-set-account-holder`,
    [ContractActionType.DAO_ACTION_SET_WITHDRAWAL_AMOUNT]: `${tokenSymbol.toLowerCase()}-action-set-withdrawal-amount`,
    [ContractActionType.DAO_ACTION_SET_WITHDRAWAL_PERIOD]: `${tokenSymbol.toLowerCase()}-action-set-withdrawal-period`,
    [ContractActionType.DAO_ACTION_TOGGLE_RESOURCE_BY_NAME]: `${tokenSymbol.toLowerCase()}-action-toggle-resource`,
  };
}

// detects a specialized type of print event from a stacks transaction that has the following structure:
// { notification: "title", payload: { ...data } }

type SIP019PrintEvent = {
  notification: string;
  payload: unknown;
};

export function convertSIP019PrintEvent(event: ClarityEvent): SIP019PrintEvent {
  // check if the event is a print event
  if (event.event !== "print_event") {
    throw new Error("Event is not a print event");
  }
  // check if the event data is a tuple
  if (event.data.value?.type !== ClarityType.Tuple) {
    throw new Error("Event data is not a tuple");
  }
  // verify the notification and payload keys exist
  const tupleData = event.data.value.data;
  if (!("notification" in tupleData) || !("payload" in tupleData)) {
    throw new Error(
      "Event data does not contain notification and payload keys"
    );
  }
  const payloadTuple = tupleData.payload as TupleCV;
  const payloadData = Object.fromEntries(
    Object.entries(payloadTuple.data).map(
      ([key, value]: [string, ClarityValue]) => [key, cvToValue(value, true)]
    )
  );
  // return the typed event
  return {
    notification: cvToValue(tupleData.notification, true),
    payload: payloadData,
  };
}

export function getDaoTokens(
  tokenContractAddress: string,
  tokenDexContractAddress: string,
  address: string,
  satsAmount: number
) {
  const getDaoTokensReceipt = simnet.callPublicFn(
    tokenDexContractAddress,
    "buy",
    [Cl.principal(tokenContractAddress), Cl.uint(satsAmount)],
    address
  );

  return getDaoTokensReceipt;
}

export function fundVoters(
  tokenContractAddress: string,
  tokenDexContractAddress: string,
  voters: string[]
) {
  const amounts: Map<string, number> = new Map();
  for (const voter of voters) {
    const stxAmount = Math.floor(Math.random() * 500000000) + 1000000;
    const getDaoTokensReceipt = getDaoTokens(
      tokenContractAddress,
      tokenDexContractAddress,
      voter,
      stxAmount
    );
    expect(getDaoTokensReceipt.result).toBeOk(Cl.bool(true));
    const getDaoTokensEvent = getDaoTokensReceipt.events.find(
      (eventRecord) => eventRecord.event === "ft_transfer_event"
    );
    expect(getDaoTokensEvent).toBeDefined();
    const daoTokensAmount = parseInt(getDaoTokensEvent!.data.amount);
    amounts.set(voter, daoTokensAmount);
  }
  // progress chain for at-block calls
  simnet.mineEmptyBlocks(10);
  return amounts;
}

export function constructDao(
  deployer: string,
  baseDaoContractAddress: string,
  bootstrapContractAddress: string
) {
  const constructDaoReceipt = simnet.callPublicFn(
    baseDaoContractAddress,
    "construct",
    [Cl.principal(bootstrapContractAddress)],
    deployer
  );

  return constructDaoReceipt;
}

export function passCoreProposal(
  coreProposalsContractAddress: string,
  proposalContractAddress: string,
  sender: string,
  voters: string[],
  voteSettings: VoteSettings
) {
  // progress past the first voting period
  simnet.mineEmptyBlocks(voteSettings.votingPeriod);

  // create-proposal
  const createProposalReceipt = simnet.callPublicFn(
    coreProposalsContractAddress,
    "create-proposal",
    [Cl.principal(proposalContractAddress)],
    sender
  );
  expect(createProposalReceipt.result).toBeOk(Cl.bool(true));

  // progress past the voting delay
  simnet.mineEmptyBlocks(voteSettings.votingDelay);

  // vote-on-proposal
  for (const voter of voters) {
    const voteReceipt = simnet.callPublicFn(
      coreProposalsContractAddress,
      "vote-on-proposal",
      [Cl.principal(proposalContractAddress), Cl.bool(true)],
      voter
    );
    expect(voteReceipt.result).toBeOk(Cl.bool(true));
  }
  // progress past the voting period + execution delay
  simnet.mineEmptyBlocks(voteSettings.votingPeriod + voteSettings.votingDelay);
  // conclude-proposal
  const concludeProposalReceipt = simnet.callPublicFn(
    coreProposalsContractAddress,
    "conclude-proposal",
    [Cl.principal(proposalContractAddress)],
    sender
  );
  // return final receipt for processing
  return concludeProposalReceipt;
}

export function failCoreProposal(
  coreProposalsContractAddress: string,
  proposalContractAddress: string,
  sender: string,
  voters: string[],
  voteSettings: VoteSettings
) {
  // progress past the first voting period
  simnet.mineEmptyBlocks(voteSettings.votingPeriod);

  // create-proposal
  const createProposalReceipt = simnet.callPublicFn(
    coreProposalsContractAddress,
    "create-proposal",
    [Cl.principal(proposalContractAddress)],
    sender
  );
  expect(createProposalReceipt.result).toBeOk(Cl.bool(true));

  // progress past the voting delay
  simnet.mineEmptyBlocks(voteSettings.votingDelay);

  // vote-on-proposal
  for (const voter of voters) {
    const voteReceipt = simnet.callPublicFn(
      coreProposalsContractAddress,
      "vote-on-proposal",
      [Cl.principal(proposalContractAddress), Cl.bool(false)],
      voter
    );
    expect(voteReceipt.result).toBeOk(Cl.bool(true));
  }
  // progress past the voting period + execution delay
  simnet.mineEmptyBlocks(voteSettings.votingPeriod + voteSettings.votingDelay);
  // conclude-proposal
  const concludeProposalReceipt = simnet.callPublicFn(
    coreProposalsContractAddress,
    "conclude-proposal",
    [Cl.principal(proposalContractAddress)],
    sender
  );
  // return final receipt for processing
  return concludeProposalReceipt;
}

export function passActionProposal(
  actionProposalsContractAddress: string,
  proposalContractAddress: string,
  proposalId: number,
  proposalParams: ClarityValue,
  deployer: string,
  sender: string,
  voters: string[],
  voteSettings: VoteSettings
) {
  // propose-action
  const proposeActionReceipt = simnet.callPublicFn(
    actionProposalsContractAddress,
    "propose-action",
    [
      Cl.principal(proposalContractAddress),
      Cl.buffer(Cl.serialize(proposalParams)),
    ],
    sender
  );
  expect(proposeActionReceipt.result).toBeOk(Cl.bool(true));

  // progress past the voting delay
  simnet.mineEmptyBlocks(voteSettings.votingDelay);
  // vote-on-proposal
  for (const voter of voters) {
    const voteReceipt = simnet.callPublicFn(
      actionProposalsContractAddress,
      "vote-on-proposal",
      [Cl.uint(proposalId), Cl.bool(true)],
      voter
    );
    expect(voteReceipt.result).toBeOk(Cl.bool(true));
  }
  // progress past the end block and delay
  simnet.mineEmptyBlocks(voteSettings.votingPeriod + voteSettings.votingDelay);
  // conclude-proposal
  const concludeProposalReceipt = simnet.callPublicFn(
    actionProposalsContractAddress,
    "conclude-proposal",
    [Cl.uint(proposalId), Cl.principal(proposalContractAddress)],
    deployer
  );
  // return final receipt for processing
  return concludeProposalReceipt;
}
