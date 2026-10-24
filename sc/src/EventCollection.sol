// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice Nontransferable public event memories; eligibility is attested by an authorized issuer.
/// @dev No payable, admin mint, burn, cap reset or metadata update path. Each claim mints exactly one.
contract EventCollection is ERC1155, AccessControl, EIP712 {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "Claim(uint256 collectionId,address recipient,address issuer,bytes32 nonce,uint256 deadline)"
    );

    struct Claim {
        uint256 collectionId;
        address recipient;
        address issuer;
        bytes32 nonce;
        uint256 deadline;
    }

    struct Collection {
        bytes32 eventId;
        uint256 cap;
        string metadataURI;
    }
    mapping(uint256 => Collection) public collections;
    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => mapping(address => bool)) public claimed;
    mapping(address => mapping(bytes32 => bool)) public usedNonces;

    error InvalidAddress();
    error InvalidCollection();
    error CollectionExists();
    error ClaimExpired();
    error InvalidSignature();
    error UnsupportedWallet();
    error AlreadyClaimed();
    error NonceUsed();
    error SoldOut();
    error Nontransferable();

    event CollectionCreated(
        uint256 indexed collectionId, bytes32 indexed eventId, uint256 cap, string metadataURI
    );
    event CollectionClaimed(uint256 indexed collectionId, address indexed recipient, address indexed issuer);

    constructor(address admin, address issuer) ERC1155("") EIP712("MootzEventCollection", "1") {
        if (admin == address(0) || issuer == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, issuer);
    }

    /// @dev Admin must use reviewed public event/issuer artwork metadata; strings are public and not content-scanned.
    function createCollection(uint256 id, bytes32 eventId, uint256 cap, string calldata metadataURI)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (id == 0 || eventId == bytes32(0) || cap == 0 || bytes(metadataURI).length == 0) {
            revert InvalidCollection();
        }
        if (collections[id].cap != 0) revert CollectionExists();
        collections[id] = Collection({eventId: eventId, cap: cap, metadataURI: metadataURI});
        emit CollectionCreated(id, eventId, cap, metadataURI);
        emit URI(metadataURI, id);
    }

    function uri(uint256 id) public view override returns (string memory) {
        if (collections[id].cap == 0) revert InvalidCollection();
        return collections[id].metadataURI;
    }

    function hashClaim(Claim memory voucher) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, voucher)));
    }

    /// @notice Anyone may submit a voucher; ownership always goes to its signed recipient.
    function claim(Claim calldata voucher, bytes calldata signature) external {
        if (voucher.recipient == address(0) || voucher.issuer == address(0)) revert InvalidAddress();
        if (collections[voucher.collectionId].cap == 0) revert InvalidCollection();
        if (block.timestamp > voucher.deadline) revert ClaimExpired();
        _checkRole(ISSUER_ROLE, voucher.issuer);
        if (voucher.issuer.code.length != 0) revert UnsupportedWallet();
        if (ECDSA.recover(hashClaim(voucher), signature) != voucher.issuer) revert InvalidSignature();
        if (claimed[voucher.collectionId][voucher.recipient]) revert AlreadyClaimed();
        if (usedNonces[voucher.issuer][voucher.nonce]) revert NonceUsed();
        if (totalSupply[voucher.collectionId] >= collections[voucher.collectionId].cap) revert SoldOut();

        // Reserve all policy state before ERC1155's external recipient callback. Reverts roll back everything.
        claimed[voucher.collectionId][voucher.recipient] = true;
        usedNonces[voucher.issuer][voucher.nonce] = true;
        ++totalSupply[voucher.collectionId];
        _mint(voucher.recipient, voucher.collectionId, 1, "");
        emit CollectionClaimed(voucher.collectionId, voucher.recipient, voucher.issuer);
    }

    function setApprovalForAll(address, bool) public pure override {
        revert Nontransferable();
    }

    /// @dev Central policy also rejects empty/zero-value batch transfers and burns on every inherited path.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        if (from != address(0)) revert Nontransferable();
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
