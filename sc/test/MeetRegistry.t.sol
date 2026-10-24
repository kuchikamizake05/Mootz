// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;
import {TestBase} from "./TestBase.sol";
import {MeetRegistry} from "../src/MeetRegistry.sol";

contract MeetRegistryTest is TestBase {
    MeetRegistry internal registry;
    MeetRegistry.MeetOffer internal offer;
    MeetRegistry.MeetAccept internal acceptance;
    bytes internal posterSig;
    bytes internal scannerSig;
    uint256 internal acceptedAt;

    function setUp() public {
        initAccounts();
        registry = new MeetRegistry(address(this), address(this));
        offer = MeetRegistry.MeetOffer(
            registry.RECORD_MEET(),
            keccak256("meet-1"),
            keccak256("moment-1"),
            keccak256("salted synthetic media"),
            poster,
            keccak256("nonce-1"),
            block.timestamp,
            block.timestamp + 60,
            keccak256("workshop-a")
        );
        acceptedAt = block.timestamp + 30;
        signPair();
        VM.warp(acceptedAt);
    }

    function signPair() internal {
        acceptance = MeetRegistry.MeetAccept(registry.RECORD_MEET(), registry.hashOffer(offer), scanner);
        posterSig = sig(POSTER_KEY, registry.hashOffer(offer));
        scannerSig = sig(SCANNER_KEY, registry.hashAccept(acceptance));
    }

    function record() internal {
        registry.recordMeet(offer, acceptance, posterSig, scannerSig, acceptedAt);
    }

    function rejected() internal {
        VM.expectRevert();
        record();
        eq(registry.meetCount(poster), 0);
        yes(!registry.recorded(offer.meetId));
        yes(!registry.usedNonces(poster, offer.nonce));
    }

    function testValidPairRecordsCountsOnce() public {
        record();
        yes(registry.recorded(offer.meetId));
        yes(registry.usedNonces(poster, offer.nonce));
        eq(registry.meetCount(poster), 1);
        eq(registry.meetCount(scanner), 1);
        eq(registry.eventMeetCount(poster, offer.eventId), 1);
        eq(registry.eventMeetCount(scanner, offer.eventId), 1);
        VM.expectRevert();
        record();
        eq(registry.meetCount(poster), 1);
    }

    function testRelayAfterQRExpiryWithinDeadline() public {
        VM.warp(offer.expiresAt + 1);
        record();
        eq(registry.meetCount(scanner), 1);
    }

    function testSubmissionDeadlineInclusive() public {
        VM.warp(acceptedAt + 300);
        record();
        eq(registry.meetCount(scanner), 1);
    }

    function testLateSubmissionRejected() public {
        VM.warp(acceptedAt + 301);
        rejected();
    }

    function testAcceptAtExpiryRejected() public {
        acceptedAt = offer.expiresAt;
        VM.warp(acceptedAt);
        rejected();
    }

    function testAcceptBeforeOfferRejected() public {
        acceptedAt = offer.issuedAt - 1;
        rejected();
    }

    function testFutureAcceptRejected() public {
        acceptedAt = block.timestamp + 1;
        rejected();
    }

    function testFutureOfferRejected() public {
        offer.issuedAt = block.timestamp + 1;
        signPair();
        rejected();
    }

    function testWrongQRDurationRejected() public {
        offer.expiresAt += 1;
        signPair();
        rejected();
    }

    function testPosterOptOutRejected() public {
        offer.action = registry.OFFCHAIN_MEET();
        signPair();
        rejected();
    }

    function testScannerOptOutRejected() public {
        acceptance.action = registry.OFFCHAIN_MEET();
        scannerSig = sig(SCANNER_KEY, registry.hashAccept(acceptance));
        rejected();
    }

    function testUnknownActionRejected() public {
        offer.action = bytes32(uint256(42));
        signPair();
        rejected();
    }

    function testWrongPosterSignatureRejected() public {
        posterSig = sig(SCANNER_KEY, registry.hashOffer(offer));
        rejected();
    }

    function testWrongScannerSignatureRejected() public {
        scannerSig = sig(POSTER_KEY, registry.hashAccept(acceptance));
        rejected();
    }

    function testSameSignerRejected() public {
        acceptance.scanner = poster;
        scannerSig = sig(POSTER_KEY, registry.hashAccept(acceptance));
        rejected();
    }

    function testDigestMismatchRejected() public {
        acceptance.offerDigest = keccak256("other-offer");
        scannerSig = sig(SCANNER_KEY, registry.hashAccept(acceptance));
        rejected();
    }

    function testTamperedEventRejected() public {
        offer.eventId = keccak256("different-event");
        rejected();
    }

    function testTamperedCommitmentRejected() public {
        offer.photoCommitment = keccak256("changed-media");
        rejected();
    }

    function testWrongChainRejected() public {
        VM.chainId(1);
        rejected();
    }

    function testWrongContractDomainRejected() public {
        MeetRegistry other = new MeetRegistry(address(this), address(this));
        posterSig = sig(POSTER_KEY, other.hashOffer(offer));
        rejected();
    }

    function testUnauthorizedRelayRejected() public {
        VM.prank(scanner);
        VM.expectRevert();
        record();
    }

    function testRevokedRelayRejected() public {
        registry.revokeRole(registry.RELAYER_ROLE(), address(this));
        rejected();
    }

    function testUnauthorizedRoleGrantRejected() public {
        bytes32 role = registry.RELAYER_ROLE();
        VM.prank(scanner);
        VM.expectRevert();
        registry.grantRole(role, scanner);
    }

    function testReusedPosterNonceRejected() public {
        record();
        offer.meetId = keccak256("meet-2");
        signPair();
        VM.expectRevert();
        record();
        eq(registry.meetCount(poster), 1);
    }

    function testDuplicateIDWithNewNonceRejected() public {
        record();
        offer.nonce = keccak256("nonce-2");
        signPair();
        VM.expectRevert();
        record();
        yes(!registry.usedNonces(poster, offer.nonce));
    }

    function testNoEventDoesNotIncrementEventCounts() public {
        offer.eventId = bytes32(0);
        signPair();
        record();
        eq(registry.meetCount(poster), 1);
        eq(registry.eventMeetCount(poster, bytes32(0)), 0);
    }

    function testIndependentEventsCountSeparately() public {
        bytes32 originalEvent = offer.eventId;
        record();
        offer.meetId = keccak256("meet-2");
        offer.nonce = keccak256("nonce-2");
        offer.eventId = keccak256("event-b");
        signPair();
        record();
        eq(registry.meetCount(poster), 2);
        eq(registry.eventMeetCount(poster, originalEvent), 1);
        eq(registry.eventMeetCount(poster, offer.eventId), 1);
    }

    function testZeroMeetIDRejected() public {
        offer.meetId = bytes32(0);
        signPair();
        rejected();
    }

    function testZeroMomentIDRejected() public {
        offer.momentId = bytes32(0);
        signPair();
        rejected();
    }

    function testZeroCommitmentRejected() public {
        offer.photoCommitment = bytes32(0);
        signPair();
        rejected();
    }

    function testZeroScannerRejected() public {
        acceptance.scanner = address(0);
        rejected();
    }

    function testMalformedSignatureRejected() public {
        posterSig = hex"0001";
        rejected();
    }

    function testContractSignerUnsupported() public {
        VM.etch(poster, hex"60006000f3");
        rejected();
    }

    function testFuzzDifferentNoncesRecordExactlyOnce(bytes32 nonce, bytes32 id) public {
        if (id == bytes32(0)) return;
        offer.nonce = nonce;
        offer.meetId = id;
        signPair();
        record();
        eq(registry.meetCount(scanner), 1);
        VM.expectRevert();
        record();
    }
}
