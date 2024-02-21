
;; title: stacks-m2m-v2
;; version: 0.0.2
;; summary: HTTP 402 payments powered by Stacks

;; traits
;;
(impl-trait .stacks-m2m-trait-v1.stacks-m2m-trait-v1)

;; tokens
;; 
;; MAINNET
;; xBTC SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-wbtc
;; aBTC SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-abtc
;; TESTNET
(define-constant ABTC_CONTRACT .stacks-m2m-abtc)

;; constants
;;

;; initially scoped to service provider deploying a contract
(define-constant DEPLOYER contract-caller)
(define-constant SELF (as-contract tx-sender))

;; math helpers (credit: ALEX)
(define-constant ONE_8 (pow u10 u8))

;; errors
(define-constant ERR_UNAUTHORIZED (err u1000))
(define-constant ERR_INVALID_PARAMS (err u1001))
(define-constant ERR_NAME_ALREADY_USED (err u1002))
(define-constant ERR_SAVING_RESOURCE_DATA (err u1003))
(define-constant ERR_DELETING_RESOURCE_DATA (err u1004))
(define-constant ERR_RESOURCE_NOT_FOUND (err u1005))
(define-constant ERR_USER_ALREADY_EXISTS (err u1006))
(define-constant ERR_SAVING_USER_DATA (err u1007))
(define-constant ERR_USER_NOT_FOUND (err u1008))
(define-constant ERR_INVOICE_ALREADY_PAID (err u1009))
(define-constant ERR_SAVING_INVOICE_DATA (err u1010))
(define-constant ERR_SETTING_MEMO_ON_TRANSFER (err u1011))

;; data vars
;;

;; tracking counts for each map
(define-data-var userCount uint u0)
(define-data-var resourceCount uint u0)
(define-data-var invoiceCount uint u0)

;; payout address, deployer can set
(define-data-var paymentAddress principal DEPLOYER)

;; data maps
;;

;; tracks user indexes by address
(define-map UserIndexes
  principal ;; user address
  uint      ;; user index
)

;; tracks full user data keyed by user index
;; can iterate over full map with userCount data-var
(define-map UserData
  uint ;; user index
  {
    address: principal,
    totalSpent: uint,
    totalUsed: uint,
  }
)

;; tracks resource indexes by resource name
(define-map ResourceIndexes
  (string-utf8 50) ;; resource name
  uint             ;; resource index
)

;; tracks resources added by deployer keyed by resource index
;; can iterate over full map with resourceCount data-var
(define-map ResourceData
  uint ;; resource index
  {
    createdAt: uint,
    ;; enabled: bool, ;; use instead of deleting resources?
    ;; url: (string-utf8 255), ;; would need setter, health check
    name: (string-utf8 50),
    description: (string-utf8 255),
    price: uint,
    totalSpent: uint,
    totalUsed: uint,
  }
)

;; tracks invoices paid by users requesting access to a resource
(define-map InvoiceData
  uint ;; invoice count
  {
    amount: uint,
    createdAt: uint,
    userIndex: uint,
    resourceName: (string-utf8 50),
    resourceIndex: uint,
  }
)

;; tracks last payment from user for a resource
(define-map RecentPayments
  {
    userIndex: uint,
    resourceIndex: uint,
  }
  uint ;; invoice count
)


;; read only functions
;;

;; returns total registered users
(define-read-only (get-total-users)
  (var-get userCount)
)

;; returns user index for address if known
(define-read-only (get-user-index (user principal))
  (map-get? UserIndexes user)
)

;; returns user data by user index if known
(define-read-only (get-user-data (index uint))
  (map-get? UserData index)
)

;; returns user data by address if known
(define-read-only (get-user-data-by-address (user principal))
  (get-user-data (unwrap! (get-user-index user) none))
)

;; returns total registered resources
(define-read-only (get-total-resources)
  (var-get resourceCount)
)

;; returns resource index for name if known
(define-read-only (get-resource-index (name (string-utf8 50)))
  (map-get? ResourceIndexes name)
)

;; returns resource data by resource index if known
(define-read-only (get-resource (index uint))
  (map-get? ResourceData index)
)

;; returns resource data by resource name if known
(define-read-only (get-resource-by-name (name (string-utf8 50)))
  (get-resource (unwrap! (get-resource-index name) none))
)

;; returns total registered invoices
(define-read-only (get-total-invoices)
  (var-get invoiceCount)
)

;; returns invoice data by invoice index if known
(define-read-only (get-invoice (index uint))
  (map-get? InvoiceData index)
)

;; returns invoice index by user index and resource index if known
(define-read-only (get-recent-payment (resourceIndex uint) (userIndex uint))
  (map-get? RecentPayments {
    userIndex: userIndex,
    resourceIndex: resourceIndex,
  })
)

;; returns invoice data by user index and resource index if known
(define-read-only (get-recent-payment-data (resourceIndex uint) (userIndex uint))
  (get-invoice (unwrap! (get-recent-payment resourceIndex userIndex) none))
)

;; returns invoice data by user address and resource name if known
(define-read-only (get-recent-payment-data-by-address (name (string-utf8 50)) (user principal))
  (get-recent-payment-data (unwrap! (get-resource-index name) none) (unwrap! (get-user-index user) none))
)

;; returns payment address
(define-read-only (get-payment-address)
  (some (var-get paymentAddress))
)

;; public functions
;;

;; sets payment address used for invoices
;; only accessible by deployer or current payment address
(define-public (set-payment-address (oldAddress principal) (newAddress principal))
  (begin
    ;; check that old address matches current address
    (asserts! (is-eq oldAddress (var-get paymentAddress)) ERR_UNAUTHORIZED)
    ;; address cannot be the same
    (asserts! (not (is-eq oldAddress newAddress)) ERR_UNAUTHORIZED)
    ;; check if caller matches deployer or oldAddress
    (asserts! (or
      (is-eq contract-caller oldAddress)
      (try! (is-deployer))
    ) ERR_UNAUTHORIZED)
    ;; set new payment address
    (ok (var-set paymentAddress newAddress))
  )
)

;; adds active resource that invoices can be generated for
;; only accessible by deployer
(define-public (add-resource (name (string-utf8 50)) (description (string-utf8 255)) (price uint))
  (let
    (
      (newCount (+ (get-total-resources) u1))
    )
    ;; check if caller matches deployer
    (try! (is-deployer))
    ;; check all values are provided
    (asserts! (> (len name) u0) ERR_INVALID_PARAMS)
    (asserts! (> (len description) u0) ERR_INVALID_PARAMS)
    (asserts! (> price u0) ERR_INVALID_PARAMS)
    ;; update ResourceIndexes map, check name is unique
    (asserts! (map-insert ResourceIndexes name newCount) ERR_NAME_ALREADY_USED)
    ;; update ResourceData map
    (asserts! (map-insert ResourceData
      newCount
      {
        createdAt: block-height,
        name: name,
        description: description,
        price: price,
        totalSpent: u0,
        totalUsed: u0,
      }
    ) ERR_SAVING_RESOURCE_DATA)
    ;; increment resourceCount
    (var-set resourceCount newCount)
    ;; return new count
    (ok newCount)
  )
)

;; deletes active resource that invoices can be generated against
;; does not delete unique name, rule stays enforced to prevent
;; any bait/switch and other weirdness while we're exploring
;; TODO: explore toggle for enabled vs map deletion
(define-public (delete-resource (index uint))
  (begin
    ;; check if caller matches deployer
    (try! (is-deployer))
    ;; check provided index is within range
    (asserts! (and (> index u0) (<= index (var-get resourceCount))) ERR_INVALID_PARAMS)
    ;; return and delete resource data from map
    (ok (asserts! (map-delete ResourceData index) ERR_DELETING_RESOURCE_DATA))
  )
)

;; adapter to allow deleting by name instead of index
(define-public (delete-resource-by-name (name (string-utf8 50)))
  (delete-resource (unwrap! (get-resource-index name) ERR_INVALID_PARAMS))
)

;; allows a user to pay an invoice for a resource
(define-public (pay-invoice (resourceIndex uint) (memo (optional (buff 34))))
  (let
    (
      (newCount (+ (get-total-invoices) u1))
      (lastAnchoredBlock (- block-height u1))
      (resourceData (unwrap! (get-resource resourceIndex) ERR_RESOURCE_NOT_FOUND))
      (userIndex (unwrap! (get-or-create-user contract-caller) ERR_USER_NOT_FOUND))
      (userData (unwrap! (get-user-data userIndex) ERR_USER_NOT_FOUND))
    )
    ;; update InvoiceIndexes map, check invoice hash is unique
    ;; (asserts! (map-insert InvoiceIndexes invoiceHash newCount) ERR_INVOICE_ALREADY_PAID)
    ;; update InvoiceData map
    (asserts! (map-insert InvoiceData
      newCount
      {
        amount: (get price resourceData),
        createdAt: block-height,
        ;; hash: invoiceHash,
        userIndex: userIndex,
        resourceName: (get name resourceData),
        resourceIndex: resourceIndex,
      }
    ) ERR_SAVING_INVOICE_DATA)
    ;; update RecentPayments map
    (map-set RecentPayments
      {
        userIndex: userIndex,
        resourceIndex: resourceIndex,
      }
      newCount
    )
    ;; update UserData map
    (map-set UserData
      userIndex
      (merge userData {
        totalSpent: (+ (get totalSpent userData) (get price resourceData)),
        totalUsed: (+ (get totalUsed userData) u1)
      })
    )
    ;; update ResourceData map
    (map-set ResourceData
      resourceIndex
      (merge resourceData {
        totalSpent: (+ (get totalSpent resourceData) (get price resourceData)),
        totalUsed: (+ (get totalUsed resourceData) u1)
      })
    )
    ;; increment counter
    (var-set invoiceCount newCount)
    ;; print updated details
    (print {
      ;; invoiceHash: invoiceHash,
      resourceData: (get-resource resourceIndex),
      userData: (get-user-data userIndex)
    })
    ;; make transfer
    (if (is-some memo)
      ;; TODO: check for guards on price setting
      (try! (stx-transfer-memo? (get price resourceData) contract-caller (var-get paymentAddress) (unwrap! memo ERR_SETTING_MEMO_ON_TRANSFER)))
      (try! (stx-transfer? (get price resourceData) contract-caller (var-get paymentAddress)))
    )
    ;; return new count
    (ok newCount)
  )
)

(define-public (pay-invoice-by-resource-name (name (string-utf8 50)) (memo (optional (buff 34))))
  (pay-invoice (unwrap! (get-resource-index name) ERR_RESOURCE_NOT_FOUND) memo)
)

;; private functions
;;

(define-private (is-deployer)
  (ok (asserts! (is-eq contract-caller DEPLOYER) ERR_UNAUTHORIZED))
)

(define-private (get-or-create-user (address principal))
  (match (map-get? UserIndexes address)
    value (ok value) ;; return index if found
    (let
      (
        ;; increment current index
        (newCount (+ (get-total-users) u1))
      )
      ;; update UserIndexes map, check address is unique
      (asserts! (map-insert UserIndexes address newCount) ERR_USER_ALREADY_EXISTS)
      ;; update UserData map
      (asserts! (map-insert UserData 
        newCount
        {
          address: address,
          totalSpent: u0,
          totalUsed: u0,
        }
      ) ERR_SAVING_USER_DATA)
      ;; save new index
      (var-set userCount newCount)
      ;; return new index
      (ok newCount)
    )
  )
)
