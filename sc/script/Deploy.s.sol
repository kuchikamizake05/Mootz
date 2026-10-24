// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;
import {MeetRegistry} from "../src/MeetRegistry.sol";
import {EventCollection} from "../src/EventCollection.sol";

interface DeploymentVm {
    function envAddress(string calldata) external returns (address);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Uses the caller-selected encrypted Foundry account; never reads or prints a private key.
contract Deploy {
    DeploymentVm private constant VM = DeploymentVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    error WrongChain(uint256 chainId);

    function run() external returns (MeetRegistry registry, EventCollection collection) {
        if (block.chainid != 10143) revert WrongChain(block.chainid);
        address admin = VM.envAddress("MOOTZ_ADMIN_ADDRESS");
        address relayer = VM.envAddress("MOOTZ_RELAYER_ADDRESS");
        address issuer = VM.envAddress("MOOTZ_ISSUER_ADDRESS");
        VM.startBroadcast();
        registry = new MeetRegistry(admin, relayer);
        collection = new EventCollection(admin, issuer);
        VM.stopBroadcast();
    }
}
