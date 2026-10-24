// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;
import {TestBase} from "./TestBase.sol";
import {EventCollection} from "../src/EventCollection.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract ClaimReceiver is IERC1155Receiver {
    EventCollection public immutable COLLECTION;
    EventCollection.Claim internal nextVoucher;
    bytes internal nextSignature;
    bool public reject;
    bool public reentrySucceeded;

    constructor(EventCollection target) {
        COLLECTION = target;
    }

    function configure(EventCollection.Claim memory voucher, bytes memory signature, bool reject_) external {
        nextVoucher = voucher;
        nextSignature = signature;
        reject = reject_;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external returns (bytes4) {
        require(!reject, "receiver rejected");
        try COLLECTION.claim(nextVoucher, nextSignature) {
            reentrySucceeded = true;
        } catch {}
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        revert("batch unexpected");
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == type(IERC1155Receiver).interfaceId || id == 0x01ffc9a7;
    }
}

contract ReceiverSafetyTest is TestBase {
    EventCollection internal collection;
    ClaimReceiver internal receiver;
    EventCollection.Claim internal voucher;

    function setUp() public {
        initAccounts();
        collection = new EventCollection(address(this), issuer);
        collection.createCollection(1, keccak256("workshop-a"), 1, "ipfs://public-demo");
        receiver = new ClaimReceiver(collection);
        voucher =
            EventCollection.Claim(1, address(receiver), issuer, keccak256("first"), block.timestamp + 300);
    }

    function testCallbackCannotExceedLastSupplySlot() public {
        EventCollection.Claim memory next =
            EventCollection.Claim(1, scanner, issuer, keccak256("second"), block.timestamp + 300);
        receiver.configure(next, sig(ISSUER_KEY, collection.hashClaim(next)), false);
        collection.claim(voucher, sig(ISSUER_KEY, collection.hashClaim(voucher)));
        yes(!receiver.reentrySucceeded());
        eq(collection.totalSupply(1), 1);
        eq(collection.balanceOf(scanner, 1), 0);
        yes(!collection.usedNonces(issuer, next.nonce));
    }

    function testRejectingReceiverRollsBackNonceClaimAndSupply() public {
        receiver.configure(voucher, "", true);
        bytes memory signature = sig(ISSUER_KEY, collection.hashClaim(voucher));
        VM.expectRevert();
        collection.claim(voucher, signature);
        yes(!collection.claimed(1, address(receiver)));
        yes(!collection.usedNonces(issuer, voucher.nonce));
        eq(collection.totalSupply(1), 0);
        eq(collection.balanceOf(address(receiver), 1), 0);
        receiver.configure(voucher, signature, false);
        collection.claim(voucher, signature);
        eq(collection.totalSupply(1), 1);
        yes(!receiver.reentrySucceeded());
    }
}
