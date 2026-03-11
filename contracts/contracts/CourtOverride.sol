// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface ILandNFT {
    function freezeProperty(uint256 tokenId, string calldata reason) external;
    function unfreezeProperty(uint256 tokenId) external;
    function forceTransfer(address from, address to, uint256 tokenId, string calldata reason) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ISaleContract {
    function freezeTransaction(uint256 saleId, string calldata reason) external;
    function cancelTransaction(uint256 saleId, string calldata reason) external;
}

/**
 * @title CourtOverride
 * @notice Specialized contract for judicial interventions in the land registry system.
 */
contract CourtOverride is AccessControl {

    bytes32 public constant JUDGE_ROLE = keccak256("JUDGE_ROLE");

    ILandNFT public landNFT;
    ISaleContract public saleContract;

    event JudicialFreeze(uint256 indexed propertyId, string reason);
    event JudicialTransferReversed(uint256 indexed propertyId, address from, address to, string reason);
    event JudicialSaleCancelled(uint256 indexed saleId, string reason);

    constructor(address _landNFT, address _saleContract) {
        landNFT = ILandNFT(_landNFT);
        saleContract = ISaleContract(_saleContract);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(JUDGE_ROLE, msg.sender);
    }

    /**
     * @notice Freeze a property by court order.
     */
    function freezeProperty(uint256 _propertyId, string calldata _reason) external onlyRole(JUDGE_ROLE) {
        landNFT.freezeProperty(_propertyId, _reason);
        emit JudicialFreeze(_propertyId, _reason);
    }

    /**
     * @notice Reverse a transfer (e.g., fraudulent sale or court order).
     * @dev Uses forceTransfer on the NFT contract.
     */
    function reverseTransfer(
        uint256 _propertyId,
        address _previousOwner,
        string calldata _reason
    ) external onlyRole(JUDGE_ROLE) {
        address currentOwner = landNFT.ownerOf(_propertyId);
        landNFT.forceTransfer(currentOwner, _previousOwner, _propertyId, _reason);
        emit JudicialTransferReversed(_propertyId, currentOwner, _previousOwner, _reason);
    }

    /**
     * @notice Cancel an ongoing illegal or disputed sale.
     */
    function cancelSale(uint256 _saleId, string calldata _reason) external onlyRole(JUDGE_ROLE) {
        saleContract.cancelTransaction(_saleId, _reason);
        emit JudicialSaleCancelled(_saleId, _reason);
    }
}
