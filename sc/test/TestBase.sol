// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

interface Vm {
    function addr(uint256) external returns (address);
    function sign(uint256, bytes32) external returns (uint8, bytes32, bytes32);
    function prank(address) external;
    function warp(uint256) external;
    function chainId(uint256) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes calldata) external;
    function etch(address, bytes calldata) external;
    function readFile(string calldata) external view returns (string memory);
    function parseJsonBytes32(string calldata, string calldata) external pure returns (bytes32);
    function parseJsonBytes(string calldata, string calldata) external pure returns (bytes memory);
    function parseJsonAddress(string calldata, string calldata) external pure returns (address);
    function parseJsonUint(string calldata, string calldata) external pure returns (uint256);
}

abstract contract TestBase {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 internal constant POSTER_KEY = 0xA11CE;
    uint256 internal constant SCANNER_KEY = 0xB0B;
    uint256 internal constant ISSUER_KEY = 0xC0FFEE;
    address internal poster;
    address internal scanner;
    address internal issuer;

    function initAccounts() internal {
        VM.chainId(10143);
        VM.warp(1_800_000_000);
        poster = VM.addr(POSTER_KEY);
        scanner = VM.addr(SCANNER_KEY);
        issuer = VM.addr(ISSUER_KEY);
    }

    function sig(uint256 key, bytes32 digest) internal returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = VM.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function eq(uint256 a, uint256 b) internal pure {
        require(a == b, "uint mismatch");
    }

    function eq(bytes32 a, bytes32 b) internal pure {
        require(a == b, "hash mismatch");
    }

    function yes(bool value) internal pure {
        require(value, "expected true");
    }
}
