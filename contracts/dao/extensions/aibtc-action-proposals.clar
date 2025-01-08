;; title: aibtcdev-actions
;; version: 1.0.0
;; summary: An extension that manages voting on predefined actions using a SIP-010 Stacks token.
;; description: This contract allows voting on specific extension actions with a lower threshold than direct-execute.

;; traits
;;
(impl-trait .aibtcdev-dao-traits-v1.extension)

(use-trait ft-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)
(use-trait treasury-trait .aibtcdev-dao-traits-v1.treasury)
(use-trait messaging-trait .aibtcdev-dao-traits-v1.messaging)
(use-trait resources-trait .aibtcdev-dao-traits-v1.resources)
(use-trait action-trait .aibtcdev-dao-traits-v1.action)

;; constants
;;
(define-constant SELF (as-contract tx-sender))
(define-constant VOTING_PERIOD u144) ;; 144 Bitcoin blocks, ~1 day
(define-constant VOTING_QUORUM u66) ;; 66% of liquid supply (total supply - treasury)

;; error messages - authorization
(define-constant ERR_UNAUTHORIZED (err u1000))
(define-constant ERR_NOT_DAO_OR_EXTENSION (err u1001))

;; error messages - initialization
(define-constant ERR_NOT_INITIALIZED (err u1100))
(define-constant ERR_ALREADY_INITIALIZED (err u1101))

;; error messages - treasury
(define-constant ERR_TREASURY_MUST_BE_CONTRACT (err u1200))
(define-constant ERR_TREASURY_CANNOT_BE_SELF (err u1201))
(define-constant ERR_TREASURY_ALREADY_SET (err u1202))
(define-constant ERR_TREASURY_MISMATCH (err u1203))
(define-constant ERR_TREASURY_NOT_INITIALIZED (err u1204))

;; error messages - voting token
(define-constant ERR_TOKEN_MUST_BE_CONTRACT (err u1300))
(define-constant ERR_TOKEN_NOT_INITIALIZED (err u1301))
(define-constant ERR_TOKEN_MISMATCH (err u1302))
(define-constant ERR_INSUFFICIENT_BALANCE (err u1303))

;; error messages - proposals
(define-constant ERR_PROPOSAL_NOT_FOUND (err u1400))
(define-constant ERR_PROPOSAL_ALREADY_EXECUTED (err u1401))
(define-constant ERR_PROPOSAL_STILL_ACTIVE (err u1402))
(define-constant ERR_SAVING_PROPOSAL (err u1403))
(define-constant ERR_PROPOSAL_ALREADY_CONCLUDED (err u1404))

;; error messages - voting
(define-constant ERR_VOTE_TOO_SOON (err u1500))
(define-constant ERR_VOTE_TOO_LATE (err u1501))
(define-constant ERR_ALREADY_VOTED (err u1502))
(define-constant ERR_ZERO_VOTING_POWER (err u1503))
(define-constant ERR_QUORUM_NOT_REACHED (err u1504))

;; error messages - actions
(define-constant ERR_INVALID_ACTION (err u1600))
(define-constant ERR_INVALID_PARAMETERS (err u1601))

;; data vars
;;
(define-data-var protocolTreasury principal .aibtc-treasury) ;; the treasury contract for protocol funds
(define-data-var votingToken principal SELF) ;; the FT contract used for voting

;; data maps
;;
(define-constant VALID_ACTIONS (list
  "set-account-holder" ;; aibtc-bank-account
  "set-withdrawal-period" ;; aibtc-bank-account, with limits
  "set-withdrawal-amount";; aibtc-bank-account, with limits
  "send-message" ;; aibtc-onchain-messaging
  "add-resource" ;; aibtc-payments-invoices
  "allow-asset" ;; aibtc-treasury
  "toggle-resource" ;; aibtc-payments-invoices toggle-resource-by-name
))

;; exploring which structure works better vs list
(define-map Actions
  (string-ascii 50)
  bool
)
(map-set Actions "set-account-holder" true) ;; aibtc-bank-account
(map-set Actions "set-withdrawal-period" true) ;; aibtc-bank-account, with limits
(map-set Actions "set-withdrawal-amount" true) ;; aibtc-bank-account, with limits
(map-set Actions "send-message" true) ;; aibtc-onchain-messaging
(map-set Actions "add-resource" true) ;; aibtc-payments-invoices
(map-set Actions "toggle-resource" true) ;; aibtc-payments-invoices toggle-resource-by-name
(map-set Actions "allow-asset" true) ;; aibtc-treasury

(define-map Proposals
  uint ;; proposal id
  {
    action: principal, ;; action contract
    parameters: (buff 2048), ;; action parameters
    createdAt: uint, ;; block height
    caller: principal, ;; contract caller
    creator: principal, ;; proposal creator (tx-sender)
    startBlock: uint, ;; block height
    endBlock: uint, ;; block height
    votesFor: uint, ;; total votes for
    votesAgainst: uint, ;; total votes against
    concluded: bool, ;; has the proposal concluded
    passed: bool, ;; did the proposal pass
  }
)

(define-map VotingRecords
  {
    proposalId: uint, ;; proposal id
    voter: principal ;; voter address
  }
  uint ;; total votes
)

(define-data-var proposalCount uint u0)

;; public functions
;;

(define-public (callback (sender principal) (memo (buff 34)))
  (ok true)
)

(define-public (set-protocol-treasury (treasury <treasury-trait>))
  (let
    (
      (treasuryContract (contract-of treasury))
    )
    (try! (is-dao-or-extension))
    ;; treasury must be a contract
    (asserts! (not (is-standard treasuryContract)) ERR_TREASURY_MUST_BE_CONTRACT)
    ;; treasury must not be already set
    (asserts! (is-eq (var-get protocolTreasury) SELF) ERR_TREASURY_NOT_INITIALIZED)
    ;; treasury cannot be the voting contract
    (asserts! (not (is-eq treasuryContract SELF)) ERR_TREASURY_CANNOT_BE_SELF)
    (print {
      notification: "set-protocol-treasury",
      payload: {
        treasury: treasuryContract
      }
    })
    (ok (var-set protocolTreasury treasuryContract))
  )
)

(define-public (set-voting-token (token <ft-trait>))
  (let
    (
      (tokenContract (contract-of token))
    )
    (try! (is-dao-or-extension))
    ;; token must be a contract
    (asserts! (not (is-standard tokenContract)) ERR_TOKEN_MUST_BE_CONTRACT)
    ;; token must not be already set
    (asserts! (is-eq (var-get votingToken) SELF) ERR_TOKEN_NOT_INITIALIZED)
    (print {
      notification: "set-voting-token",
      payload: {
        token: tokenContract
      }
    })
    (ok (var-set votingToken tokenContract))
  )
)

(define-public (propose-action (action <action-trait>) (parameters (buff 2048)) (token <ft-trait>))
  (let
    (
      (tokenContract (contract-of token))
      (newId (+ (var-get proposalCount) u1))
    )
    ;; required variables must be set
    (asserts! (is-initialized) ERR_NOT_INITIALIZED)
    ;; token matches set voting token
    (asserts! (is-eq tokenContract (var-get votingToken)) ERR_TOKEN_MISMATCH)
    ;; caller has the required balance
    (asserts! (> (try! (contract-call? token get-balance tx-sender)) u0) ERR_INSUFFICIENT_BALANCE)
    ;; print proposal creation event
    (print {
      notification: "propose-action",
      payload: {
        proposalId: newId,
        action: action,
        parameters: parameters,
        creator: tx-sender,
        startBlock: burn-block-height,
        endBlock: (+ burn-block-height VOTING_PERIOD)
      }
    })
    ;; create the proposal
    (asserts! (map-insert Proposals newId {
      action: (contract-of action),
      parameters: parameters,
      createdAt: burn-block-height,
      caller: contract-caller,
      creator: tx-sender,
      startBlock: burn-block-height,
      endBlock: (+ burn-block-height VOTING_PERIOD),
      votesFor: u0,
      votesAgainst: u0,
      concluded: false,
      passed: false,
    }) ERR_SAVING_PROPOSAL)
    ;; increment proposal count
    (ok (var-set proposalCount newId))
  )
)

(define-public (vote-on-proposal (proposalId uint) (token <ft-trait>) (vote bool))
  (let
    (
      (tokenContract (contract-of token))
      (senderBalance (try! (contract-call? token get-balance tx-sender)))
    )
    ;; required variables must be set
    (asserts! (is-initialized) ERR_NOT_INITIALIZED)
    ;; token matches set voting token
    (asserts! (is-eq tokenContract (var-get votingToken)) ERR_TOKEN_MISMATCH)
    ;; caller has the required balance
    (asserts! (> senderBalance u0) ERR_INSUFFICIENT_BALANCE)
    ;; get proposal record
    (let
      (
        (proposalRecord (unwrap! (map-get? Proposals proposalId) ERR_PROPOSAL_NOT_FOUND))
      )
      ;; proposal is still active
      (asserts! (>= burn-block-height (get startBlock proposalRecord)) ERR_VOTE_TOO_SOON)
      (asserts! (< burn-block-height (get endBlock proposalRecord)) ERR_VOTE_TOO_LATE)
      ;; proposal not already concluded
      (asserts! (not (get concluded proposalRecord)) ERR_PROPOSAL_ALREADY_CONCLUDED)
      ;; vote not already cast
      (asserts! (is-none (map-get? VotingRecords {proposalId: proposalId, voter: tx-sender})) ERR_ALREADY_VOTED)
      ;; print vote event
      (print {
        notification: "vote-on-proposal",
        payload: {
          proposalId: proposalId,
          voter: tx-sender,
          amount: senderBalance
        }
      })
      ;; update the proposal record
      (map-set Proposals proposalId
        (if vote
          (merge proposalRecord {votesFor: (+ (get votesFor proposalRecord) senderBalance)})
          (merge proposalRecord {votesAgainst: (+ (get votesAgainst proposalRecord) senderBalance)})
        )
      )
      ;; record the vote for the sender
      (ok (map-set VotingRecords {proposalId: proposalId, voter: tx-sender} senderBalance))
    )
  )
)

(define-public (conclude-proposal (proposalId uint) (action <action-trait>) (treasury <treasury-trait>) (token <ft-trait>))
  (let
    (
      (proposalRecord (unwrap! (map-get? Proposals proposalId) ERR_PROPOSAL_NOT_FOUND))
      (tokenContract (contract-of token))
      (tokenTotalSupply (try! (contract-call? token get-total-supply)))
      (treasuryContract (contract-of treasury))
      (treasuryBalance (try! (contract-call? token get-balance treasuryContract)))
      (votePassed (> (get votesFor proposalRecord) (* tokenTotalSupply (- u100 treasuryBalance) VOTING_QUORUM)))
    )
    ;; required variables must be set
    (asserts! (is-initialized) ERR_NOT_INITIALIZED)
    ;; verify treasury matches protocol treasury
    (asserts! (is-eq treasuryContract (var-get protocolTreasury)) ERR_TREASURY_MISMATCH)
    ;; proposal past end block height
    (asserts! (>= burn-block-height (get endBlock proposalRecord)) ERR_PROPOSAL_STILL_ACTIVE)
    ;; proposal not already concluded
    (asserts! (not (get concluded proposalRecord)) ERR_PROPOSAL_ALREADY_CONCLUDED)
    ;; print conclusion event
    (print {
      notification: "conclude-proposal",
      payload: {
        proposalId: proposalId,
        passed: votePassed
      }
    })
    ;; update the proposal record
    (map-set Proposals proposalId
      (merge proposalRecord {
        concluded: true,
        passed: votePassed
      })
    )
    ;; execute the action only if it passed
    ;; (and votePassed (try! (execute-action proposalRecord)))
    ;; return the result
    (ok (and votePassed (try! (contract-call? action run (get parameters proposalRecord)))))
  )
)

;; read only functions
;;

(define-read-only (get-protocol-treasury)
  (if (is-eq (var-get protocolTreasury) SELF)
    none
    (some (var-get protocolTreasury))
  )
)

(define-read-only (get-voting-token)
  (if (is-eq (var-get votingToken) SELF)
    none
    (some (var-get votingToken))
  )
)

(define-read-only (get-proposal (proposalId uint))
  (map-get? Proposals proposalId)
)

(define-read-only (get-total-votes (proposalId uint) (voter principal))
  (default-to u0 (map-get? VotingRecords {proposalId: proposalId, voter: voter}))
)

(define-read-only (is-initialized)
  ;; check if the required variables are set
  (not (or
    (is-eq (var-get votingToken) SELF)
    (is-eq (var-get protocolTreasury) SELF)
  ))
)

(define-read-only (get-voting-period)
  VOTING_PERIOD
)

(define-read-only (get-voting-quorum)
  VOTING_QUORUM
)

(define-read-only (get-total-proposals)
  (var-get proposalCount)
)

;; private functions
;;

(define-private (is-dao-or-extension)
  (ok (asserts! (or (is-eq tx-sender .aibtcdev-base-dao)
    (contract-call? .aibtcdev-base-dao is-extension contract-caller)) ERR_NOT_DAO_OR_EXTENSION
  ))
)

