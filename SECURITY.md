# Security

Mootz is currently a private, documentation-only repository. There is no deployed Mootz service or security audit to report as completed.

## Reporting

Report suspected vulnerabilities privately to the repository owner through an existing trusted private channel. If GitHub private vulnerability reporting is enabled later, it may be used; this document does not claim it is configured. Do not include credentials, exploit-ready private data, or user photos in public issues.

## Implementation boundaries

Keep service-role credentials, issuer/relayer keys, and provider secrets server-side. Authorize every media, moment, Meet, Dot, and comment request for the caller. Meet Offer and Meet Accept verification (two distinct signers, Accept bound to the Offer digest), nonce and relayer deadline, the 60-second QR expiry (single scanner), server-side distance and accuracy checks, and collection supply caps are security-critical. The contract does not verify location; the backend does.

Verification location data is sensitive: keep it private, show only an approximate area, and set a retention policy before real users. Onchain recording is opt-in and enforced by signed actions: only RECORD_MEET from both participants is accepted by the contract, and OFFCHAIN_MEET is rejected. Meet records reveal which wallets met and when, cannot be deleted once final, and photos and locations must never appear in chain payloads or token metadata. Participants need an accurate explanation before signing; deleting a photo or turning opt-in off does not erase a finalized chain record.

Use testnet identities and nonvaluable fixtures for initial verification. Any future production release needs environment-specific access, recovery, monitoring, provider, contract, and key-management verification described in [operations](docs/operations.md).
