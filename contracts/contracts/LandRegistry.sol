// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface ILandNFT {
    function mintPropertyWithDetails(
        address to,
        uint256 tokenId,
        string calldata propertyCode,
        string calldata surveyNumber,
        uint256 areaSqft,
        string calldata metadataURI
    ) external;
}

/**
 * @title LandRegistry
 * @notice Sovereign Government Land Registry smart contract.
 *         Stores full cadastral, survey, multi-ownership / joint ownership, guidance valuation, and encumbrance records matching the database.
 */
contract LandRegistry is AccessControl {

    bytes32 public constant AUTHORITY_ROLE     = keccak256("AUTHORITY_ROLE");
    bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE_CONTRACT_ROLE");
    bytes32 public constant COURT_ROLE         = keccak256("COURT_ROLE");

    ILandNFT public landNFT;

    enum RegistrationStatus { PENDING, APPROVED, REJECTED, FROZEN }

    struct CoOwner {
        address ownerWallet;
        uint256 sharePercentageBps; // 10000 = 100.00%
        string  ownershipType;      // sole_owner, joint_tenancy, tenancy_in_common, coparcenary
        bool    isPrimary;
        uint256 addedAt;
    }

    struct PropertyRecord {
        string  propertyCode;         // Unique Gov Property Code (e.g. KA-2026-00012)
        string  surveyNumber;         // Revenue Survey / Hissa Number
        string  surveyDetails;        // Taluk, Sub-division, Hobli
        string  district;             // District name
        string  state;                // State name
        uint256 areaSqft;             // Plot Area in Sq. Feet
        string  coordinates;          // GPS Lat, Lng
        address originalOwner;        // First / Original Registered Primary Owner
        address currentOwner;         // Current Legal Title Holder (Primary)
        string  documentHash;         // IPFS CID of Primary Registered Deed
        bool    isEncumbered;         // Active Lien / Bank Hold / Encumbrance Flag
        string  encumbranceReason;    // Encumbrance details (e.g., Bank Lien SBI Ref #8941)
        uint256 estimatedFairPrice;   // Official Guidance / Circle Valuation (INR)
        RegistrationStatus status;   // PENDING, APPROVED, REJECTED, FROZEN
        uint256 tokenId;              // Minted NFT Token ID
        uint256 registeredAt;         // Registration submission timestamp
        uint256 approvedAt;           // Official approval timestamp
        bool    exists;
    }

    // propertyCode => PropertyRecord
    mapping(string => PropertyRecord) public propertyRecords;
    // propertyCode => CoOwner[]
    mapping(string => CoOwner[]) public propertyCoOwners;
    // tokenId => propertyCode
    mapping(uint256 => string) public tokenIdToCode;
    // List of all registered property codes
    string[] public allPropertyCodes;

    uint256 private _propertyCounter;

    event PropertySubmitted(
        string indexed propertyCode,
        string surveyNumber,
        address indexed originalOwner,
        uint256 areaSqft,
        string district,
        string state
    );

    event CoOwnerRegistered(
        string indexed propertyCode,
        address indexed ownerWallet,
        uint256 sharePercentageBps,
        string ownershipType
    );

    event PropertyApproved(
        string indexed propertyCode,
        uint256 indexed tokenId,
        address indexed owner,
        uint256 approvedAt
    );

    event PropertyRejected(string indexed propertyCode, string reason);
    
    event EncumbranceStatusChanged(string indexed propertyCode, bool isEncumbered, string reason);

    event OwnershipTransferred(
        string indexed propertyCode,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    constructor(address _landNFT) {
        require(_landNFT != address(0), "Invalid NFT address");
        landNFT = ILandNFT(_landNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUTHORITY_ROLE, msg.sender);
    }

    /**
     * @notice Register a new land property with multiple co-owners and fractional shares.
     */
    function registerPropertyWithCoOwners(
        string calldata _propertyCode,
        string calldata _surveyNumber,
        string calldata _surveyDetails,
        string calldata _district,
        string calldata _state,
        uint256 _areaSqft,
        string calldata _coordinates,
        address[] calldata _coOwnerWallets,
        uint256[] calldata _sharesBps,
        string[] calldata _ownershipTypes,
        string calldata _documentHash,
        uint256 _estimatedFairPrice
    ) external {
        require(!propertyRecords[_propertyCode].exists, "Property already registered");
        require(_coOwnerWallets.length > 0, "At least one owner required");
        require(
            _coOwnerWallets.length == _sharesBps.length &&
            _coOwnerWallets.length == _ownershipTypes.length,
            "Array length mismatch"
        );

        uint256 totalBps = 0;
        for (uint256 i = 0; i < _coOwnerWallets.length; i++) {
            require(_coOwnerWallets[i] != address(0), "Invalid owner wallet");
            require(_sharesBps[i] > 0, "Share must be > 0");
            totalBps += _sharesBps[i];
        }
        require(totalBps == 10000, "Total co-owner shares must equal 100% (10000 bps)");

        address primaryOwner = _coOwnerWallets[0];

        propertyRecords[_propertyCode] = PropertyRecord({
            propertyCode: _propertyCode,
            surveyNumber: _surveyNumber,
            surveyDetails: _surveyDetails,
            district: _district,
            state: _state,
            areaSqft: _areaSqft,
            coordinates: _coordinates,
            originalOwner: primaryOwner,
            currentOwner: primaryOwner,
            documentHash: _documentHash,
            isEncumbered: false,
            encumbranceReason: "",
            estimatedFairPrice: _estimatedFairPrice,
            status: RegistrationStatus.PENDING,
            tokenId: 0,
            registeredAt: block.timestamp,
            approvedAt: 0,
            exists: true
        });

        for (uint256 i = 0; i < _coOwnerWallets.length; i++) {
            propertyCoOwners[_propertyCode].push(CoOwner({
                ownerWallet: _coOwnerWallets[i],
                sharePercentageBps: _sharesBps[i],
                ownershipType: _ownershipTypes[i],
                isPrimary: (i == 0),
                addedAt: block.timestamp
            }));

            emit CoOwnerRegistered(_propertyCode, _coOwnerWallets[i], _sharesBps[i], _ownershipTypes[i]);
        }

        allPropertyCodes.push(_propertyCode);
        emit PropertySubmitted(_propertyCode, _surveyNumber, primaryOwner, _areaSqft, _district, _state);
    }

    /**
     * @notice Register property with full cadastral details (single primary owner).
     */
    function registerPropertyWithCadastral(
        string calldata _propertyCode,
        string calldata _surveyNumber,
        string calldata _surveyDetails,
        string calldata _district,
        string calldata _state,
        uint256 _areaSqft,
        string calldata _coordinates,
        address _owner,
        string calldata _documentHash,
        uint256 _estimatedFairPrice
    ) external {
        require(!propertyRecords[_propertyCode].exists, "Property already registered");
        require(_owner != address(0), "Invalid owner address");

        propertyRecords[_propertyCode] = PropertyRecord({
            propertyCode: _propertyCode,
            surveyNumber: _surveyNumber,
            surveyDetails: _surveyDetails,
            district: _district,
            state: _state,
            areaSqft: _areaSqft,
            coordinates: _coordinates,
            originalOwner: _owner,
            currentOwner: _owner,
            documentHash: _documentHash,
            isEncumbered: false,
            encumbranceReason: "",
            estimatedFairPrice: _estimatedFairPrice,
            status: RegistrationStatus.PENDING,
            tokenId: 0,
            registeredAt: block.timestamp,
            approvedAt: 0,
            exists: true
        });

        propertyCoOwners[_propertyCode].push(CoOwner({
            ownerWallet: _owner,
            sharePercentageBps: 10000,
            ownershipType: "sole_owner",
            isPrimary: true,
            addedAt: block.timestamp
        }));

        allPropertyCodes.push(_propertyCode);
        emit PropertySubmitted(_propertyCode, _surveyNumber, _owner, _areaSqft, _district, _state);
    }

    /**
     * @notice Backward-compatible registerProperty wrapper.
     */
    function registerProperty(
        string calldata _propertyCode,
        address _owner,
        string calldata _documentHash
    ) external {
        require(!propertyRecords[_propertyCode].exists, "Property already registered");
        require(_owner != address(0), "Invalid owner address");

        propertyRecords[_propertyCode] = PropertyRecord({
            propertyCode: _propertyCode,
            surveyNumber: "SRV-REG",
            surveyDetails: "",
            district: "",
            state: "",
            areaSqft: 0,
            coordinates: "",
            originalOwner: _owner,
            currentOwner: _owner,
            documentHash: _documentHash,
            isEncumbered: false,
            encumbranceReason: "",
            estimatedFairPrice: 0,
            status: RegistrationStatus.PENDING,
            tokenId: 0,
            registeredAt: block.timestamp,
            approvedAt: 0,
            exists: true
        });

        propertyCoOwners[_propertyCode].push(CoOwner({
            ownerWallet: _owner,
            sharePercentageBps: 10000,
            ownershipType: "sole_owner",
            isPrimary: true,
            addedAt: block.timestamp
        }));

        allPropertyCodes.push(_propertyCode);
        emit PropertySubmitted(_propertyCode, "SRV-REG", _owner, 0, "", "");
    }

    /**
     * @notice Government Authority officially approves title and mints ERC-721 Land NFT.
     */
    function approveProperty(string calldata _propertyCode, string calldata _metadataURI) external onlyRole(AUTHORITY_ROLE) {
        PropertyRecord storage p = propertyRecords[_propertyCode];
        require(p.exists, "Property record not found");
        require(p.status == RegistrationStatus.PENDING, "Not in PENDING state");

        p.status = RegistrationStatus.APPROVED;
        p.approvedAt = block.timestamp;
        _propertyCounter++;
        p.tokenId = _propertyCounter;
        tokenIdToCode[p.tokenId] = _propertyCode;

        // Mint NFT with complete on-chain cadastral parameters
        landNFT.mintPropertyWithDetails(
            p.currentOwner,
            p.tokenId,
            p.propertyCode,
            p.surveyNumber,
            p.areaSqft,
            _metadataURI
        );

        emit PropertyApproved(_propertyCode, p.tokenId, p.currentOwner, p.approvedAt);
    }

    /**
     * @notice Authority rejects land registration.
     */
    function rejectProperty(string calldata _propertyCode, string calldata _reason) external onlyRole(AUTHORITY_ROLE) {
        PropertyRecord storage p = propertyRecords[_propertyCode];
        require(p.exists, "Property not found");
        require(p.status == RegistrationStatus.PENDING, "Not in PENDING state");

        p.status = RegistrationStatus.REJECTED;
        emit PropertyRejected(_propertyCode, _reason);
    }

    /**
     * @notice Mark a property as encumbered (Bank Lien / Court Stay / Dispute).
     */
    function markEncumbered(string calldata _propertyCode, bool _status) external {
        require(hasRole(AUTHORITY_ROLE, msg.sender) || hasRole(COURT_ROLE, msg.sender), "Unauthorized");
        require(propertyRecords[_propertyCode].exists, "Property not found");
        propertyRecords[_propertyCode].isEncumbered = _status;
        emit EncumbranceStatusChanged(_propertyCode, _status, _status ? "Encumbrance flag set" : "Encumbrance cleared");
    }

    /**
     * @notice Set detailed encumbrance reason.
     */
    function setEncumbranceWithReason(string calldata _propertyCode, bool _status, string calldata _reason) external {
        require(hasRole(AUTHORITY_ROLE, msg.sender) || hasRole(COURT_ROLE, msg.sender), "Unauthorized");
        require(propertyRecords[_propertyCode].exists, "Property not found");
        PropertyRecord storage p = propertyRecords[_propertyCode];
        p.isEncumbered = _status;
        p.encumbranceReason = _status ? _reason : "";
        emit EncumbranceStatusChanged(_propertyCode, _status, _reason);
    }

    /**
     * @notice Update current owner in the registry ledger (invoked by SaleContract or CourtOverride).
     */
    function updatePropertyOwner(string calldata _propertyCode, address _newOwner) external {
        require(
            hasRole(AUTHORITY_ROLE, msg.sender) ||
            hasRole(SALE_CONTRACT_ROLE, msg.sender) ||
            hasRole(COURT_ROLE, msg.sender),
            "Caller cannot update owner"
        );
        PropertyRecord storage p = propertyRecords[_propertyCode];
        require(p.exists, "Property not found");
        
        address prev = p.currentOwner;
        p.currentOwner = _newOwner;

        // Reset primary co-owner to new owner
        delete propertyCoOwners[_propertyCode];
        propertyCoOwners[_propertyCode].push(CoOwner({
            ownerWallet: _newOwner,
            sharePercentageBps: 10000,
            ownershipType: "sole_owner",
            isPrimary: true,
            addedAt: block.timestamp
        }));

        emit OwnershipTransferred(_propertyCode, prev, _newOwner, block.timestamp);
    }

    /**
     * @notice Fetch all co-owners for a property.
     */
    function getCoOwners(string calldata _propertyCode) external view returns (CoOwner[] memory) {
        return propertyCoOwners[_propertyCode];
    }

    /**
     * @notice Fetch full property details by propertyCode.
     */
    function getPropertyRecord(string calldata _propertyCode) external view returns (PropertyRecord memory) {
        return propertyRecords[_propertyCode];
    }

    /**
     * @notice Fetch full property details by tokenId.
     */
    function getPropertyByTokenId(uint256 _tokenId) external view returns (PropertyRecord memory) {
        string memory code = tokenIdToCode[_tokenId];
        require(bytes(code).length > 0, "Token ID not found in registry");
        return propertyRecords[code];
    }

    /**
     * @notice Total registered properties count.
     */
    function getTotalPropertiesCount() external view returns (uint256) {
        return allPropertyCodes.length;
    }
}
