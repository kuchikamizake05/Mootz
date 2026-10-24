// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice Public opt-in meeting records. No GPS, media authenticity or human uniqueness verification.
/// @dev Candidate INT-01 interface. Only an authorized backend relay may attest acceptance time/eligibility.
contract MeetRegistry is AccessControl, EIP712 {
    bytes32 public constant RECORD_MEET = keccak256("RECORD_MEET");
    bytes32 public constant OFFCHAIN_MEET = keccak256("OFFCHAIN_MEET");
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    uint256 public constant QR_LIFETIME = 60;
    uint256 public constant RELAY_WINDOW = 300;
    bytes32 public constant OFFER_TYPEHASH = keccak256(
        "MeetOffer(bytes32 action,bytes32 meetId,bytes32 momentId,bytes32 photoCommitment,address poster,bytes32 nonce,uint256 issuedAt,uint256 expiresAt,bytes32 eventId)"
    );
    bytes32 public constant ACCEPT_TYPEHASH =
        keccak256("MeetAccept(bytes32 action,bytes32 offerDigest,address scanner)");

    struct MeetOffer {
        bytes32 action;
        bytes32 meetId;
        bytes32 momentId;
        bytes32 photoCommitment;
        address poster;
        bytes32 nonce;
        uint256 issuedAt;
        uint256 expiresAt;
        bytes32 eventId;
    }

    struct MeetAccept {
        bytes32 action;
        bytes32 offerDigest;
        address scanner;
    }

    struct MeetRecord {
        address poster;
        address scanner;
        uint256 acceptedAt;
        bytes32 eventId;
        bytes32 photoCommitment;
    }

    mapping(bytes32 => bool) public recorded;
    mapping(bytes32 => MeetRecord) public meets;
    mapping(address => mapping(bytes32 => bool)) public usedNonces;
    mapping(address => uint256) public meetCount;
    mapping(address => mapping(bytes32 => uint256)) public eventMeetCount;

    error InvalidAddress();
    error ConsentRequired();
    error InvalidPayload();
    error InvalidTime();
    error RelayExpired();
    error AlreadyRecorded();
    error NonceUsed();
    error InvalidSignature();
    error UnsupportedWallet();

    event MeetRecorded(
        bytes32 indexed meetId,
        address indexed poster,
        address indexed scanner,
        uint256 acceptedAt,
        bytes32 eventId,
        bytes32 photoCommitment
    );

    constructor(address admin, address relayer) EIP712("MootzMeetRegistry", "1") {
        if (admin == address(0) || relayer == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RELAYER_ROLE, relayer);
    }

    /// @notice Full EIP-712 digest, not merely the struct hash.
    function hashOffer(MeetOffer memory offer) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(OFFER_TYPEHASH, offer)));
    }

    function hashAccept(MeetAccept memory acceptance) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(ACCEPT_TYPEHASH, acceptance)));
    }

    /// @param acceptedAt Backend-attested receipt/validation time, not a provable signature timestamp.
    /// @dev Relay must validate both signatures, 100m distance, pair/area/day limits and event check-ins offchain.
    function recordMeet(
        MeetOffer calldata offer,
        MeetAccept calldata acceptance,
        bytes calldata posterSignature,
        bytes calldata scannerSignature,
        uint256 acceptedAt
    ) external onlyRole(RELAYER_ROLE) {
        if (offer.action != RECORD_MEET || acceptance.action != RECORD_MEET) {
            revert ConsentRequired();
        }
        if (
            offer.meetId == bytes32(0) || offer.momentId == bytes32(0) || offer.photoCommitment == bytes32(0)
                || offer.poster == address(0) || acceptance.scanner == address(0)
                || acceptance.scanner == offer.poster
        ) revert InvalidPayload();
        if (offer.poster.code.length != 0 || acceptance.scanner.code.length != 0) revert UnsupportedWallet();
        if (
            offer.issuedAt > block.timestamp || offer.expiresAt < offer.issuedAt
                || offer.expiresAt - offer.issuedAt != QR_LIFETIME || acceptedAt < offer.issuedAt
                || acceptedAt >= offer.expiresAt || acceptedAt > block.timestamp
        ) revert InvalidTime();
        if (block.timestamp - acceptedAt > RELAY_WINDOW) revert RelayExpired();
        if (recorded[offer.meetId]) revert AlreadyRecorded();
        if (usedNonces[offer.poster][offer.nonce]) revert NonceUsed();
        bytes32 offerDigest = hashOffer(offer);
        if (acceptance.offerDigest != offerDigest) revert InvalidPayload();
        if (
            ECDSA.recover(offerDigest, posterSignature) != offer.poster
                || ECDSA.recover(hashAccept(acceptance), scannerSignature) != acceptance.scanner
        ) revert InvalidSignature();

        recorded[offer.meetId] = true;
        usedNonces[offer.poster][offer.nonce] = true;
        meets[offer.meetId] = MeetRecord({
            poster: offer.poster,
            scanner: acceptance.scanner,
            acceptedAt: acceptedAt,
            eventId: offer.eventId,
            photoCommitment: offer.photoCommitment
        });
        ++meetCount[offer.poster];
        ++meetCount[acceptance.scanner];
        if (offer.eventId != bytes32(0)) {
            ++eventMeetCount[offer.poster][offer.eventId];
            ++eventMeetCount[acceptance.scanner][offer.eventId];
        }
        emit MeetRecorded(
            offer.meetId, offer.poster, acceptance.scanner, acceptedAt, offer.eventId, offer.photoCommitment
        );
    }
}
