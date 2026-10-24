// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;
import {TestBase} from "./TestBase.sol";
import {MeetRegistry} from "../src/MeetRegistry.sol";
import {EventCollection} from "../src/EventCollection.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract VectorsTest is TestBase {
    string internal vector;
    MeetRegistry internal registry;
    EventCollection internal collection;

    function setUp() public {
        initAccounts();
        // Read only the tracked public fixture permitted in foundry.toml.
        // forge-lint: disable-next-line(unsafe-cheatcode)
        vector = VM.readFile("specs/vectors.json");
        MeetRegistry template = new MeetRegistry(address(this), address(this));
        EventCollection collectionTemplate = new EventCollection(address(this), issuer);
        registry = MeetRegistry(VM.parseJsonAddress(vector, ".domain.verifyingContract"));
        collection = EventCollection(VM.parseJsonAddress(vector, ".collectionDomain.verifyingContract"));
        // Fixture domains are fixed synthetic addresses, not public deployments. EIP712 rebuilds for this address.
        VM.etch(address(registry), address(template).code);
        VM.etch(address(collection), address(collectionTemplate).code);
    }

    function b(string memory path) internal view returns (bytes32) {
        return VM.parseJsonBytes32(vector, path);
    }

    function u(string memory path) internal view returns (uint256) {
        return VM.parseJsonUint(vector, path);
    }

    function a(string memory path) internal view returns (address) {
        return VM.parseJsonAddress(vector, path);
    }

    function offer() internal view returns (MeetRegistry.MeetOffer memory) {
        return MeetRegistry.MeetOffer(
            b(".offer.action"),
            b(".offer.meetId"),
            b(".offer.momentId"),
            b(".offer.photoCommitment"),
            a(".offer.poster"),
            b(".offer.nonce"),
            u(".offer.issuedAt"),
            u(".offer.expiresAt"),
            b(".offer.eventId")
        );
    }

    function testViemOfferDigestAndSignerMatchSolidity() public view {
        bytes32 digest = registry.hashOffer(offer());
        eq(digest, b(".offerDigest"));
        yes(ECDSA.recover(digest, VM.parseJsonBytes(vector, ".offerSignature")) == a(".offer.poster"));
    }

    function testViemAcceptAndOptOutDigestsMatchSolidity() public view {
        MeetRegistry.MeetAccept memory acceptance =
            MeetRegistry.MeetAccept(b(".accept.action"), b(".accept.offerDigest"), a(".accept.scanner"));
        eq(registry.hashAccept(acceptance), b(".acceptDigest"));
        yes(
            ECDSA.recover(b(".acceptDigest"), VM.parseJsonBytes(vector, ".acceptSignature"))
                == a(".accept.scanner")
        );
        acceptance.action = registry.OFFCHAIN_MEET();
        eq(registry.hashAccept(acceptance), b(".offchainAcceptDigest"));
        MeetRegistry.MeetOffer memory offchain = offer();
        offchain.action = registry.OFFCHAIN_MEET();
        eq(registry.hashOffer(offchain), b(".offchainOfferDigest"));
    }

    function testViemClaimDigestMatchesSolidity() public view {
        EventCollection.Claim memory voucher = EventCollection.Claim(
            u(".claim.collectionId"),
            a(".claim.recipient"),
            a(".claim.issuer"),
            b(".claim.nonce"),
            u(".claim.deadline")
        );
        eq(collection.hashClaim(voucher), b(".claimDigest"));
        yes(
            ECDSA.recover(b(".claimDigest"), VM.parseJsonBytes(vector, ".claimSignature"))
                == a(".claim.issuer")
        );
    }

    function testCommitmentEncodingMatchesSolidity() public view {
        eq(
            keccak256(
                abi.encode(
                    uint256(1),
                    b(".commitmentInput.momentId"),
                    b(".commitmentInput.frontDigest"),
                    b(".commitmentInput.backDigest"),
                    b(".commitmentInput.salt")
                )
            ),
            b(".offer.photoCommitment")
        );
    }
}
