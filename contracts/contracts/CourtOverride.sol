// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface ILandNFT {
    function freezeProperty(uint256 tokenId, string calldata reason) external;
    function freezePropertyWithCase(uint256 tokenId, string calldata reason, string calldata caseNumber) external;
    function unfreezeProperty(uint256 tokenId) external;
    function forceTransfer(address from, address to, uint256 tokenId, string calldata reason) external;
    function forceTransferWithCase(address from, address to, uint256 tokenId, string calldata reason, string calldata courtOrderHash) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ISaleContract {
    function freezeTransaction(uint256 saleId, string calldata reason) external;
    function cancelTransaction(uint256 saleId, string calldata reason) external;
}

interface ILandRegistry {
    function markEncumbered(string calldata propertyCode, bool status) external;
    function setEncumbranceWithReason(string calldata propertyCode, bool status, string calldata reason) external;
    function updatePropertyOwner(string calldata propertyCode, address newOwner) external;
    function tokenIdToCode(uint256 tokenId) external view returns (string memory);
}

/**
 * @title CourtOverride
 * @notice Judicial Title & Dispute Enforcement smart contract for High Courts and Civil Courts.
 *         Maintains an on-chain ledger of all court injunctions, stay orders, and forced title reversions matching the database.
 */
contract CourtOverride is AccessControl {

    bytes32 public constant JUDGE_ROLE = keccak256("JUDGE_ROLE");

    ILandNFT public landNFT;
    ISaleContract public saleContract;
    ILandRegistry public landRegistry;

    struct JudicialOrder {
        uint256 orderId;
        uint256 tokenId;
        string  caseNumber;        // Official Court Case Number (e.g. HC-2026-PN-492)
        string  courtOrderHash;    // IPFS CID of certified court injunction order
        string  benchName;         // High Court Bench / District Court
        string  reason;            // Judicial reasoning
        uint256 issuedAt;
        bool    isActive;
    }

    uint256 public orderCount;
    mapping(uint256 => JudicialOrder) public judicialOrders;
    mapping(uint256 => uint256[]) public propertyToOrders;

    event JudicialFreeze(
        uint256 indexed propertyId,
        string caseNumber,
        string courtOrderHash,
        string reason,
        uint256 timestamp
    );

    event JudicialFreezeLifted(
        uint256 indexed propertyId,
        string caseNumber,
        string courtOrderHash,
        string reason,
        uint256 timestamp
    );

    event JudicialTransferReversed(
        uint256 indexed propertyId,
        address indexed from,
        address indexed to,
        string caseNumber,
        string courtOrderHash,
        string reason
    );

    event JudicialSaleCancelled(
        uint256 indexed saleId,
        string caseNumber,
        string courtOrderHash,
        string reason
    );

    constructor(address _landNFT, address _saleContract, address _landRegistry) {
        landNFT = ILandNFT(_landNFT);
        saleContract = ISaleContract(_saleContract);
        landRegistry = ILandRegistry(_landRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(JUDGE_ROLE, msg.sender);
    }

    /**
     * @notice Issue official court injunction & stay freeze on a property.
     */
    function freezePropertyWithCourtOrder(
        uint256 _propertyId,
        string calldata _caseNumber,
        string calldata _courtOrderHash,
        string calldata _benchName,
        string calldata _reason
    ) external onlyRole(JUDGE_ROLE) returns (uint256) {
        // 1. Freeze on NFT contract
        landNFT.freezePropertyWithCase(_propertyId, _reason, _caseNumber);

        // 2. Set encumbrance on Land Registry
        try landRegistry.tokenIdToCode(_propertyId) returns (string memory code) {
            if (bytes(code).length > 0) {
                landRegistry.setEncumbranceWithReason(code, true, _reason);
            }
        } catch {}

        // 3. Record judicial order
        uint256 orderId = ++orderCount;
        judicialOrders[orderId] = JudicialOrder({
            orderId: orderId,
            tokenId: _propertyId,
            caseNumber: _caseNumber,
            courtOrderHash: _courtOrderHash,
            benchName: _benchName,
            reason: _reason,
            issuedAt: block.timestamp,
            isActive: true
        });
        propertyToOrders[_propertyId].push(orderId);

        emit JudicialFreeze(_propertyId, _caseNumber, _courtOrderHash, _reason, block.timestamp);
        return orderId;
    }

    /**
     * @notice Backward-compatible freezeProperty wrapper.
     */
    function freezeProperty(uint256 _propertyId, string calldata _reason) external onlyRole(JUDGE_ROLE) {
        landNFT.freezeProperty(_propertyId, _reason);
        try landRegistry.tokenIdToCode(_propertyId) returns (string memory code) {
            if (bytes(code).length > 0) {
                landRegistry.setEncumbranceWithReason(code, true, _reason);
            }
        } catch {}
        emit JudicialFreeze(_propertyId, "CASE-ORDER", "", _reason, block.timestamp);
    }

    /**
     * @notice Lift judicial freeze by court order.
     */
    function liftFreezeWithCourtOrder(
        uint256 _propertyId,
        string calldata _caseNumber,
        string calldata _courtOrderHash,
        string calldata _reason
    ) external onlyRole(JUDGE_ROLE) {
        landNFT.unfreezeProperty(_propertyId);

        try landRegistry.tokenIdToCode(_propertyId) returns (string memory code) {
            if (bytes(code).length > 0) {
                landRegistry.setEncumbranceWithReason(code, false, "");
            }
        } catch {}

        emit JudicialFreezeLifted(_propertyId, _caseNumber, _courtOrderHash, _reason, block.timestamp);
    }

    /**
     * @notice Judicial title reversal (reverses fraudulent or disputed title to original owner).
     */
    function reverseTransferWithCourtOrder(
        uint256 _propertyId,
        address _previousOwner,
        string calldata _caseNumber,
        string calldata _courtOrderHash,
        string calldata _reason
    ) external onlyRole(JUDGE_ROLE) {
        address currentOwner = landNFT.ownerOf(_propertyId);
        landNFT.forceTransferWithCase(currentOwner, _previousOwner, _propertyId, _reason, _courtOrderHash);

        try landRegistry.tokenIdToCode(_propertyId) returns (string memory code) {
            if (bytes(code).length > 0) {
                landRegistry.updatePropertyOwner(code, _previousOwner);
            }
        } catch {}

        emit JudicialTransferReversed(_propertyId, currentOwner, _previousOwner, _caseNumber, _courtOrderHash, _reason);
    }

    /**
     * @notice Backward-compatible reverseTransfer wrapper.
     */
    function reverseTransfer(
        uint256 _propertyId,
        address _previousOwner,
        string calldata _reason
    ) external onlyRole(JUDGE_ROLE) {
        address currentOwner = landNFT.ownerOf(_propertyId);
        landNFT.forceTransfer(currentOwner, _previousOwner, _propertyId, _reason);
        try landRegistry.tokenIdToCode(_propertyId) returns (string memory code) {
            if (bytes(code).length > 0) {
                landRegistry.updatePropertyOwner(code, _previousOwner);
            }
        } catch {}
        emit JudicialTransferReversed(_propertyId, currentOwner, _previousOwner, "", "", _reason);
    }

    /**
     * @notice Judicial cancellation of illegal or disputed sales.
     */
    function cancelSaleWithCourtOrder(
        uint256 _saleId,
        string calldata _caseNumber,
        string calldata _courtOrderHash,
        string calldata _reason
    ) external onlyRole(JUDGE_ROLE) {
        saleContract.cancelTransaction(_saleId, _reason);
        emit JudicialSaleCancelled(_saleId, _caseNumber, _courtOrderHash, _reason);
    }

    /**
     * @notice Backward-compatible cancelSale wrapper.
     */
    function cancelSale(uint256 _saleId, string calldata _reason) external onlyRole(JUDGE_ROLE) {
        saleContract.cancelTransaction(_saleId, _reason);
        emit JudicialSaleCancelled(_saleId, "", "", _reason);
    }

    /**
     * @notice Fetch judicial orders for a specific property token.
     */
    function getOrdersForProperty(uint256 _propertyId) external view returns (uint256[] memory) {
        return propertyToOrders[_propertyId];
    }

    /**
     * @notice Fetch order by ID.
     */
    function getJudicialOrder(uint256 _orderId) external view returns (JudicialOrder memory) {
        return judicialOrders[_orderId];
    }
}
