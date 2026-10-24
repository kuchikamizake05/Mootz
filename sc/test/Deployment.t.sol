// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;
import {TestBase} from "./TestBase.sol";
import {Deploy} from "../script/Deploy.s.sol";
import {MeetRegistry} from "../src/MeetRegistry.sol";
import {EventCollection} from "../src/EventCollection.sol";

contract DeploymentTest is TestBase {
    function testDeploymentScriptRejectsOtherChainsBeforeReadingConfig() public {
        Deploy deployment = new Deploy();
        VM.chainId(1);
        VM.expectRevert(abi.encodeWithSelector(Deploy.WrongChain.selector, uint256(1)));
        deployment.run();
    }

    function testRegistryRejectsMissingAdmin() public {
        VM.expectRevert(MeetRegistry.InvalidAddress.selector);
        new MeetRegistry(address(0), address(this));
    }

    function testRegistryRejectsMissingRelay() public {
        VM.expectRevert(MeetRegistry.InvalidAddress.selector);
        new MeetRegistry(address(this), address(0));
    }

    function testCollectionRejectsMissingAdmin() public {
        VM.expectRevert(EventCollection.InvalidAddress.selector);
        new EventCollection(address(0), address(this));
    }

    function testCollectionRejectsMissingIssuer() public {
        VM.expectRevert(EventCollection.InvalidAddress.selector);
        new EventCollection(address(this), address(0));
    }
}
