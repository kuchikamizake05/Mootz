// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;
import {TestBase} from "./TestBase.sol";
import {EventCollection} from "../src/EventCollection.sol";

contract EventCollectionTest is TestBase {
    EventCollection internal collection;
    EventCollection.Claim internal voucher;
    bytes internal signature;

    function setUp() public {
        initAccounts();
        collection = new EventCollection(address(this), issuer);
        collection.createCollection(1, keccak256("workshop-a"), 50, "ipfs://public-demo-metadata");
        voucher = EventCollection.Claim(1, poster, issuer, keccak256("claim-1"), block.timestamp + 300);
        signVoucher();
    }

    function signVoucher() internal {
        signature = sig(ISSUER_KEY, collection.hashClaim(voucher));
    }

    function claim() internal {
        collection.claim(voucher, signature);
    }

    function rejected() internal {
        bool nonceBefore = collection.usedNonces(issuer, voucher.nonce);
        VM.expectRevert();
        claim();
        eq(collection.balanceOf(voucher.recipient, voucher.collectionId), 0);
        yes(collection.usedNonces(issuer, voucher.nonce) == nonceBefore);
    }

    function testEligibleClaimHasReadableOwnership() public {
        claim();
        eq(collection.balanceOf(poster, 1), 1);
        eq(collection.totalSupply(1), 1);
        yes(collection.claimed(1, poster));
        yes(collection.usedNonces(issuer, voucher.nonce));
    }

    function testPermissionlessRelayCannotRedirectRecipient() public {
        VM.prank(scanner);
        claim();
        eq(collection.balanceOf(poster, 1), 1);
        eq(collection.balanceOf(scanner, 1), 0);
    }

    function testExpiredRejected() public {
        VM.warp(voucher.deadline + 1);
        rejected();
    }

    function testDeadlineInclusive() public {
        VM.warp(voucher.deadline);
        claim();
        eq(collection.totalSupply(1), 1);
    }

    function testWrongSignerRejected() public {
        signature = sig(SCANNER_KEY, collection.hashClaim(voucher));
        rejected();
    }

    function testUnauthorizedIssuerRejected() public {
        voucher.issuer = scanner;
        signature = sig(SCANNER_KEY, collection.hashClaim(voucher));
        rejected();
    }

    function testRevokedIssuerRejected() public {
        collection.revokeRole(collection.ISSUER_ROLE(), issuer);
        rejected();
    }

    function testIssuerRotationWorks() public {
        collection.revokeRole(collection.ISSUER_ROLE(), issuer);
        collection.grantRole(collection.ISSUER_ROLE(), scanner);
        voucher.issuer = scanner;
        signature = sig(SCANNER_KEY, collection.hashClaim(voucher));
        claim();
        eq(collection.totalSupply(1), 1);
    }

    function testRecipientMismatchRejected() public {
        voucher.recipient = scanner;
        rejected();
    }

    function testCollectionMismatchRejected() public {
        voucher.collectionId = 2;
        rejected();
    }

    function testNonceMutationRejected() public {
        voucher.nonce = bytes32(uint256(2));
        rejected();
    }

    function testWrongChainRejected() public {
        VM.chainId(1);
        rejected();
    }

    function testWrongDomainRejected() public {
        EventCollection other = new EventCollection(address(this), issuer);
        signature = sig(ISSUER_KEY, other.hashClaim(voucher));
        rejected();
    }

    function testMalformedSignatureRejected() public {
        signature = hex"00";
        rejected();
    }

    function testDuplicateClaimWithNewVoucherRejected() public {
        claim();
        voucher.nonce = keccak256("another-nonce");
        signVoucher();
        VM.expectRevert();
        claim();
        eq(collection.totalSupply(1), 1);
        yes(!collection.usedNonces(issuer, voucher.nonce));
    }

    function testNonceReplayAcrossRecipientsRejected() public {
        claim();
        voucher.recipient = scanner;
        signVoucher();
        rejected();
        eq(collection.totalSupply(1), 1);
    }

    function testNonceReplayAcrossCollectionsRejected() public {
        claim();
        collection.createCollection(2, keccak256("event-b"), 5, "ipfs://public-b");
        voucher.collectionId = 2;
        signVoucher();
        VM.expectRevert();
        claim();
        eq(collection.totalSupply(2), 0);
    }

    function testSingleTransferRejected() public {
        claim();
        VM.prank(poster);
        VM.expectRevert();
        collection.safeTransferFrom(poster, scanner, 1, 1, "");
        eq(collection.balanceOf(poster, 1), 1);
    }

    function testBatchTransferRejected() public {
        claim();
        uint256[] memory ids = new uint256[](1);
        ids[0] = 1;
        uint256[] memory values = new uint256[](1);
        values[0] = 1;
        VM.prank(poster);
        VM.expectRevert();
        collection.safeBatchTransferFrom(poster, scanner, ids, values, "");
    }

    function testEmptyBatchRejected() public {
        VM.prank(poster);
        VM.expectRevert();
        collection.safeBatchTransferFrom(poster, scanner, new uint256[](0), new uint256[](0), "");
    }

    function testZeroAmountTransferRejected() public {
        VM.prank(poster);
        VM.expectRevert();
        collection.safeTransferFrom(poster, scanner, 1, 0, "");
    }

    function testApprovalRejected() public {
        VM.prank(poster);
        VM.expectRevert();
        collection.setApprovalForAll(scanner, true);
    }

    function testZeroRecipientRejected() public {
        voucher.recipient = address(0);
        signVoucher();
        rejected();
    }

    function testUnknownCollectionRejected() public {
        voucher.collectionId = 99;
        signVoucher();
        rejected();
    }

    function testUnauthorizedCreateRejected() public {
        VM.prank(scanner);
        VM.expectRevert();
        collection.createCollection(2, keccak256("b"), 50, "ipfs://b");
    }

    function testNoAdminCapReset() public {
        VM.expectRevert();
        collection.createCollection(1, keccak256("workshop-a"), 1000, "ipfs://replacement");
    }

    function testZeroCapRejected() public {
        VM.expectRevert();
        collection.createCollection(2, keccak256("b"), 0, "ipfs://b");
    }

    function testZeroEventRejected() public {
        VM.expectRevert();
        collection.createCollection(2, bytes32(0), 50, "ipfs://b");
    }

    function testCap50AndOwnershipSurvivesSoldOut() public {
        for (uint256 i = 1; i <= 50; ++i) {
            // i <= 50, so this fixture address fits uint160.
            // forge-lint: disable-next-line(unsafe-typecast)
            voucher.recipient = address(uint160(i + 100));
            voucher.nonce = bytes32(i);
            signVoucher();
            claim();
        }
        eq(collection.totalSupply(1), 50);
        eq(collection.balanceOf(address(101), 1), 1);
        voucher.recipient = scanner;
        voucher.nonce = bytes32(uint256(51));
        signVoucher();
        rejected();
        eq(collection.totalSupply(1), 50);
    }

    function testFuzzCapNeverBypassed(uint8 capSeed) public {
        uint256 cap = uint256(capSeed) % 20 + 1;
        collection.createCollection(2, keccak256("b"), cap, "ipfs://public-b");
        voucher.collectionId = 2;
        for (uint256 i = 0; i <= cap; ++i) {
            // i <= 20, so this fixture address fits uint160.
            // forge-lint: disable-next-line(unsafe-typecast)
            voucher.recipient = address(uint160(i + 1000));
            voucher.nonce = bytes32(i);
            signVoucher();
            if (i == cap) VM.expectRevert();
            claim();
        }
        eq(collection.totalSupply(2), cap);
    }
}
