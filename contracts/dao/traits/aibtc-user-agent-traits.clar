;; title: aibtc-user-agent-traits
;; version: 1.0.0
;; summary: A collection of traits for user agent smart wallets

;; IMPORTS
(use-trait sip010-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)
(use-trait dao-action-trait .aibtc-dao-traits-v2.action)
(use-trait dao-proposal-trait .aibtc-dao-traits-v2.proposal)
(use-trait dao-action-proposals-trait .aibtc-dao-traits-v2.action-proposals)
(use-trait dao-core-proposals-trait .aibtc-dao-traits-v2.core-proposals)

;; USER AGENT SMART WALLET TRAIT

;; A smart wallet contract that manages assets and DAO interactions between a user and an agent
(define-trait user-agent-smart-wallet (
  ;; Asset Management Functions
  
  ;; deposit STX to the smart wallet
  ;; @param amount amount of microSTX to deposit
  ;; @returns (response bool uint)
  (deposit-stx (uint) (response bool uint))
  
  ;; deposit FT to the smart wallet
  ;; @param ft the fungible token contract
  ;; @param amount amount of tokens to deposit
  ;; @returns (response bool uint)
  (deposit-ft (<sip010-trait> uint) (response bool uint))
  
  ;; withdraw STX from the smart wallet (user only)
  ;; @param amount amount of microSTX to withdraw
  ;; @returns (response bool uint)
  (withdraw-stx (uint) (response bool uint))
  
  ;; withdraw FT from the smart wallet (user only)
  ;; @param ft the fungible token contract
  ;; @param amount amount of tokens to withdraw
  ;; @returns (response bool uint)
  (withdraw-ft (<sip010-trait> uint) (response bool uint))
  
  ;; approve an asset for deposit/withdrawal (user only)
  ;; @param asset the asset contract principal
  ;; @returns (response bool uint)
  (approve-asset (principal) (response bool uint))
  
  ;; revoke approval for an asset (user only)
  ;; @param asset the asset contract principal
  ;; @returns (response bool uint)
  (revoke-asset (principal) (response bool uint))
  
  ;; DAO Interaction Functions
  
  ;; propose an action to the DAO (user or agent)
  ;; @param action-proposals the action proposals contract
  ;; @param action the action contract
  ;; @param parameters encoded action parameters
  ;; @returns (response bool uint)
  (proxy-propose-action (<dao-action-proposals-trait> <dao-action-trait> (buff 2048)) (response bool uint))
  
  ;; create a core proposal to the DAO (user or agent)
  ;; @param core-proposals the core proposals contract
  ;; @param proposal the proposal contract
  ;; @returns (response bool uint)
  (proxy-create-proposal (<dao-core-proposals-trait> <dao-proposal-trait>) (response bool uint))
  
  ;; vote on an action proposal (user or agent)
  ;; @param action-proposals the action proposals contract
  ;; @param proposalId the proposal ID
  ;; @param vote true for yes, false for no
  ;; @returns (response bool uint)
  (vote-on-action-proposal (<dao-action-proposals-trait> uint bool) (response bool uint))
  
  ;; vote on a core proposal (user or agent)
  ;; @param core-proposals the core proposals contract
  ;; @param proposal the proposal contract
  ;; @param vote true for yes, false for no
  ;; @returns (response bool uint)
  (vote-on-core-proposal (<dao-core-proposals-trait> <dao-proposal-trait> bool) (response bool uint))
  
  ;; conclude an action proposal (user or agent)
  ;; @param action-proposals the action proposals contract
  ;; @param proposalId the proposal ID
  ;; @param action the action contract
  ;; @returns (response bool uint)
  (conclude-action-proposal (<dao-action-proposals-trait> uint <dao-action-trait>) (response bool uint))
  
  ;; conclude a core proposal (user or agent)
  ;; @param core-proposals the core proposals contract
  ;; @param proposal the proposal contract
  ;; @returns (response bool uint)
  (conclude-core-proposal (<dao-core-proposals-trait> <dao-proposal-trait>) (response bool uint))
))
