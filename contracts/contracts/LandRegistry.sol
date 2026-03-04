// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface ILandNFT {
    function mintProperty(address to, uint256 tokenId, string calldata metadataURI) external;
}

/**
 * @title LandRegistry
 * @notice Handles government property registration and approval.
 */
contract LandRegistry is AccessControl {

    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");

    ILandNFT public landNFT;

    enum RegistrationStatus { PENDING, APPROVED, REJECTED }

    struct PropertyRecord {
        address owner;
        string  propertyCode; // Unique ID from Gov
        string  documentHash;
        bool    isEncumbered;
        RegistrationStatus status;
        uint256 tokenId;
        bool    exists;
    }

    // propertyCode => Records
    mapping(string => PropertyRecord) public propertyRecords;
    
    // Counter for on-chain IDs/TokenIDs
    uint256 private _propertyCounter;

    event PropertySubmitted(string propertyCode, address indexed owner);
    event PropertyApproved(string propertyCode, uint256 indexed tokenId);
    event PropertyRejected(string propertyCode, string reason);
    event EncumbranceStatusChanged(string propertyCode, bool isEncumbered);

    constructor(address _landNFT) {
        require(_landNFT != address(0), "Invalid NFT address");
        landNFT = ILandNFT(_landNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUTHORITY_ROLE, msg.sender);
    }

    /**
     * @notice Submit a property for registration.
     */
    function registerProperty(
        string calldata _propertyCode,
        address _owner,
        string calldata _documentHash
    ) external {
        require(!propertyRecords[_propertyCode].exists, "Property already exists");
        
        propertyRecords[_propertyCode] = PropertyRecord({
            owner: _owner,
            propertyCode: _propertyCode,
            documentHash: _documentHash,
            isEncumbered: false,
            status: RegistrationStatus.PENDING,
            tokenId: 0,
            exists: true
        });

        emit PropertySubmitted(_propertyCode, _owner);
    }

    /**
     * @notice Authority approves registration and mints NFT.
     */
    function approveProperty(string calldata _propertyCode, string calldata _metadataURI) external onlyRole(AUTHORITY_ROLE) {
        PropertyRecord storage p = propertyRecords[_propertyCode];
        require(p.exists, "Property not found");
        require(p.status == RegistrationStatus.PENDING, "Not in PENDING state");

        p.status = RegistrationStatus.APPROVED;
        _propertyCounter++;
        p.tokenId = _propertyCounter;

        // Mint the NFT
        landNFT.mintProperty(p.owner, p.tokenId, _metadataURI);

        emit PropertyApproved(_propertyCode, p.tokenId);
    }

    /**
     * @notice Authority rejects registration.
     */
    function rejectProperty(string calldata _propertyCode, string calldata _reason) external onlyRole(AUTHORITY_ROLE) {
        PropertyRecord storage p = propertyRecords[_propertyCode];
        require(p.exists, "Property not found");
        require(p.status == RegistrationStatus.PENDING, "Not in PENDING state");

        p.status = RegistrationStatus.REJECTED;
        emit PropertyRejected(_propertyCode, _reason);
    }

    /**
     * @notice Mark a property as encumbered (prevents sale in SaleContract).
     */
    function markEncumbered(string calldata _propertyCode, bool _status) external onlyRole(AUTHORITY_ROLE) {
        require(propertyRecords[_propertyCode].exists, "Property not found");
        propertyRecords[_propertyCode].isEncumbered = _status;
        emit EncumbranceStatusChanged(_propertyCode, _status);
    }

    /**
     * @notice Get property record details.
     */
    function getPropertyRecord(string calldata _propertyCode) external view returns (PropertyRecord memory) {
        return propertyRecords[_propertyCode];
    }
}
