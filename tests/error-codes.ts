export enum BaseDaoErrCode {
  ERR_UNAUTHORIZED = 900,
  ERR_ALREADY_EXECUTED,
  ERR_INVALID_EXTENSION,
  ERR_NO_EMPTY_LISTS,
}

export enum ActionProposalsErrCode {
  ERR_NOT_DAO_OR_EXTENSION = 1000,
  ERR_INSUFFICIENT_BALANCE,
  ERR_FETCHING_TOKEN_DATA,
  ERR_PROPOSAL_NOT_FOUND,
  ERR_PROPOSAL_STILL_ACTIVE,
  ERR_SAVING_PROPOSAL,
  ERR_PROPOSAL_ALREADY_CONCLUDED,
  ERR_RETRIEVING_START_BLOCK_HASH,
  ERR_VOTE_TOO_SOON,
  ERR_VOTE_TOO_LATE,
  ERR_ALREADY_VOTED,
  ERR_INVALID_ACTION,
}

export enum ActionProposalsV2ErrCode {
  ERR_NOT_DAO_OR_EXTENSION = 1000,
  ERR_INSUFFICIENT_BALANCE,
  ERR_FETCHING_TOKEN_DATA,
  ERR_PROPOSAL_NOT_FOUND,
  ERR_PROPOSAL_VOTING_ACTIVE,
  ERR_PROPOSAL_EXECUTION_DELAY,
  ERR_ALREADY_PROPOSAL_AT_BLOCK,
  ERR_SAVING_PROPOSAL,
  ERR_PROPOSAL_ALREADY_CONCLUDED,
  ERR_RETRIEVING_START_BLOCK_HASH,
  ERR_VOTE_TOO_SOON,
  ERR_VOTE_TOO_LATE,
  ERR_ALREADY_VOTED,
  ERR_INVALID_ACTION,
}

export enum ActionErrCode {
  ERR_UNAUTHORIZED = 10001,
  ERR_INVALID_PARAMS,
}

export enum BankAccountErrCode {
  ERR_INVALID = 2000,
  ERR_UNAUTHORIZED,
  ERR_TOO_SOON,
  ERR_INVALID_AMOUNT,
}

export enum CoreProposalErrCode {
  ERR_NOT_DAO_OR_EXTENSION = 3000,
  ERR_FETCHING_TOKEN_DATA,
  ERR_INSUFFICIENT_BALANCE,
  ERR_PROPOSAL_NOT_FOUND,
  ERR_PROPOSAL_ALREADY_EXECUTED,
  ERR_PROPOSAL_STILL_ACTIVE,
  ERR_SAVING_PROPOSAL,
  ERR_PROPOSAL_ALREADY_CONCLUDED,
  ERR_RETRIEVING_START_BLOCK_HASH,
  ERR_VOTE_TOO_SOON,
  ERR_VOTE_TOO_LATE,
  ERR_ALREADY_VOTED,
  ERR_FIRST_VOTING_PERIOD,
}

export enum CoreProposalV2ErrCode {
  ERR_NOT_DAO_OR_EXTENSION = 3000,
  ERR_FETCHING_TOKEN_DATA,
  ERR_INSUFFICIENT_BALANCE,
  ERR_PROPOSAL_NOT_FOUND,
  ERR_PROPOSAL_ALREADY_EXECUTED,
  ERR_PROPOSAL_VOTING_ACTIVE,
  ERR_PROPOSAL_EXECUTION_DELAY,
  ERR_SAVING_PROPOSAL,
  ERR_PROPOSAL_ALREADY_CONCLUDED,
  ERR_RETRIEVING_START_BLOCK_HASH,
  ERR_VOTE_TOO_SOON,
  ERR_VOTE_TOO_LATE,
  ERR_ALREADY_VOTED,
  ERR_FIRST_VOTING_PERIOD,
}

export enum OnchainMessagingErrCode {
  INPUT_ERROR = 4000,
  ERR_UNAUTHORIZED,
}

export enum PaymentsInvoicesErrCode {
  ERR_UNAUTHORIZED = 5000,
  ERR_INVALID_PARAMS,
  ERR_NAME_ALREADY_USED,
  ERR_SAVING_RESOURCE_DATA,
  ERR_DELETING_RESOURCE_DATA,
  ERR_RESOURCE_NOT_FOUND,
  ERR_RESOURCE_DISABLED,
  ERR_USER_ALREADY_EXISTS,
  ERR_SAVING_USER_DATA,
  ERR_USER_NOT_FOUND,
  ERR_INVOICE_ALREADY_PAID,
  ERR_SAVING_INVOICE_DATA,
  ERR_INVOICE_NOT_FOUND,
  ERR_RECENT_PAYMENT_NOT_FOUND,
}

export enum TreasuryErrCode {
  ERR_UNAUTHORIZED = 6000,
  ERR_UNKNOWN_ASSSET,
}

export enum TokenOwnerErrCode {
  ERR_UNAUTHORIZED = 7000,
}

export enum DaoCharterErrCode {
  ERR_NOT_DAO_OR_EXTENSION = 8000,
  ERR_SAVING_CHARTER,
  ERR_CHARTER_TOO_SHORT,
  ERR_CHARTER_TOO_LONG,
}

export enum TokenFaktoryErrCode {
  ERR_NOT_AUTHORIZED = 401,
  ERR_NOT_OWNER,
}

export enum TokenFaktoryDexErrCode {
  ERR_MARKET_CLOSED = 1001,
  ERR_STX_NON_POSITIVE,
  ERR_STX_BALANCE_TOO_LOW,
  ERR_FT_NON_POSITIVE,
  ERR_FETCHING_BUY_INFO,
  ERR_FETCHING_SELL_INFO,
  ERR_TOKEN_NOT_AUTH = 401,
}

export enum UserAgentSmartWalletErrCode {
  ERR_UNAUTHORIZED = 1000,
  ERR_UNKNOWN_ASSET = 1001,
  ERR_OPERATION_FAILED = 1002,
}
