// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILandNFTSuccession {
    function ownerOf(uint256 tokenId) external view returns (address);
    function forceTransfer(uint256 tokenId, address from, address to, string calldata reason, string calldata courtOrderHash) external;
    function freezeProperty(uint256 tokenId, string calldata reason, string calldata courtCaseNumber) external;
    function unfreezeProperty(uint256 tokenId, string calldata reason) external;
}

interface ILandRegistrySuccession {
    function updatePropertyOwner(string calldata propertyCode, address newOwner) external;
}

/**
 * @title InheritanceSuccession
 * @notice On-chain Legal Heir & Succession Partition Registry for DigiVerify.
 * Manages deceased property succession, legal heir partition deeds, probate court orders,
 * fractional share attestation, and automated ownership reassignments.
 */
contract InheritanceSuccession is AccessControl, ReentrancyGuard {
    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");
    bytes32 public constant COURT_ROLE = keccak256("COURT_ROLE");

    enum CaseStatus {
        PENDING_REVIEW, // 0: Filed by heirs, awaiting revenue officer check
        APPROVED,       // 1: Verified by revenue officer / probate court
        EXECUTED,       // 2: Title re-assigned / partitioned
        REJECTED        // 3: Rejected / contested
    }

    struct LegalHeir {
        address heirAddress;
        string fullName;
        string relationToDeceased;
        uint256 sharePercentageBps; // 10000 = 100%
        string kycHash;
        bool isIdentityVerified;
    }

    struct SuccessionCase {
        uint256 caseId;
        uint256 tokenId;
        string propertyCode;
        address deceasedOwner;
        string deathCertificateHash;
        string probateOrderHash;
        string courtBench;
        uint256 totalHeirs;
        CaseStatus status;
        string officerRemarks;
        address primarySuccessor; // Primary nominee or designated single successor if not partitioned
        uint256 createdAt;
        uint256 executedAt;
    }

    ILandNFTSuccession public landNFT;
    ILandRegistrySuccession public landRegistry;

    uint256 public caseCount;
    mapping(uint256 => SuccessionCase) public cases;
    mapping(uint256 => LegalHeir[]) public caseHeirs;
    mapping(uint256 => uint256[]) public propertyToCases;

    event SuccessionFiled(
        uint256 indexed caseId,
        uint256 indexed tokenId,
        address indexed deceasedOwner,
        string propertyCode,
        uint256 totalHeirs
    );

    event HeirVerified(uint256 indexed caseId, uint256 heirIndex, address indexed heirAddress);

    event SuccessionApproved(uint256 indexed caseId, address indexed approvingOfficer, string remarks);

    event SuccessionExecuted(
        uint256 indexed caseId,
        uint256 indexed tokenId,
        address indexed newPrimaryOwner,
        uint256 executedAt
    );

    event SuccessionRejected(uint256 indexed caseId, string reason);

    constructor(address _landNFT, address _landRegistry) {
        if (_landNFT != address(0)) {
            landNFT = ILandNFTSuccession(_landNFT);
        }
        if (_landRegistry != address(0)) {
            landRegistry = ILandRegistrySuccession(_landRegistry);
        }
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUTHORITY_ROLE, msg.sender);
        _grantRole(COURT_ROLE, msg.sender);
    }

    function setContractAddresses(address _landNFT, address _landRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_landNFT != address(0) && _landRegistry != address(0), "Invalid contract addresses");
        landNFT = ILandNFTSuccession(_landNFT);
        landRegistry = ILandRegistrySuccession(_landRegistry);
    }

    /**
     * @notice File an on-chain inheritance succession petition with verified legal heirs.
     */
    function fileSuccessionClaim(
        uint256 _tokenId,
        string calldata _propertyCode,
        address _deceasedOwner,
        string calldata _deathCertificateHash,
        string calldata _probateOrderHash,
        string calldata _courtBench,
        address[] calldata _heirAddresses,
        string[] calldata _heirNames,
        string[] calldata _relations,
        uint256[] calldata _shareBps,
        string[] calldata _kycHashes
    ) external nonReentrant returns (uint256) {
        require(_tokenId > 0, "Invalid token ID");
        require(_deceasedOwner != address(0), "Invalid deceased owner");
        require(bytes(_deathCertificateHash).length > 0, "Death certificate hash required");
        uint256 numHeirs = _heirAddresses.length;
        require(numHeirs > 0, "At least one legal heir required");
        require(
            _heirNames.length == numHeirs &&
            _relations.length == numHeirs &&
            _shareBps.length == numHeirs &&
            _kycHashes.length == numHeirs,
            "Array length mismatch"
        );

        uint256 totalShareBps = 0;
        for (uint256 i = 0; i < numHeirs; i++) {
            require(_heirAddresses[i] != address(0), "Invalid heir address");
            require(_shareBps[i] > 0, "Share must be > 0");
            totalShareBps += _shareBps[i];
        }
        require(totalShareBps == 10000, "Total shares must equal 100% (10000 bps)");

        caseCount++;
        uint256 newCaseId = caseCount;

        cases[newCaseId] = SuccessionCase({
            caseId: newCaseId,
            tokenId: _tokenId,
            propertyCode: _propertyCode,
            deceasedOwner: _deceasedOwner,
            deathCertificateHash: _deathCertificateHash,
            probateOrderHash: _probateOrderHash,
            courtBench: _courtBench,
            totalHeirs: numHeirs,
            status: CaseStatus.PENDING_REVIEW,
            officerRemarks: "",
            primarySuccessor: _heirAddresses[0],
            createdAt: block.timestamp,
            executedAt: 0
        });

        for (uint256 i = 0; i < numHeirs; i++) {
            caseHeirs[newCaseId].push(LegalHeir({
                heirAddress: _heirAddresses[i],
                fullName: _heirNames[i],
                relationToDeceased: _relations[i],
                sharePercentageBps: _shareBps[i],
                kycHash: _kycHashes[i],
                isIdentityVerified: false
            }));
        }

        propertyToCases[_tokenId].push(newCaseId);

        emit SuccessionFiled(newCaseId, _tokenId, _deceasedOwner, _propertyCode, numHeirs);
        return newCaseId;
    }

    /**
     * @notice Verify identity and KYC of an individual legal heir.
     */
    function verifyHeirIdentity(uint256 _caseId, uint256 _heirIndex) external onlyRole(AUTHORITY_ROLE) {
        SuccessionCase storage sCase = cases[_caseId];
        require(sCase.caseId != 0, "Case does not exist");
        require(_heirIndex < caseHeirs[_caseId].length, "Heir index out of bounds");

        caseHeirs[_caseId][_heirIndex].isIdentityVerified = true;
        emit HeirVerified(_caseId, _heirIndex, caseHeirs[_caseId][_heirIndex].heirAddress);
    }

    /**
     * @notice Revenue officer approves succession petition after document and KYC verification.
     */
    function approveSuccessionCase(
        uint256 _caseId,
        string calldata _officerRemarks
    ) external onlyRole(AUTHORITY_ROLE) {
        SuccessionCase storage sCase = cases[_caseId];
        require(sCase.caseId != 0, "Case does not exist");
        require(sCase.status == CaseStatus.PENDING_REVIEW, "Case not pending");

        // Verify all heirs verified
        for (uint256 i = 0; i < caseHeirs[_caseId].length; i++) {
            require(caseHeirs[_caseId][i].isIdentityVerified, "All heirs must be verified");
        }

        sCase.status = CaseStatus.APPROVED;
        sCase.officerRemarks = _officerRemarks;

        emit SuccessionApproved(_caseId, msg.sender, _officerRemarks);
    }

    /**
     * @notice Execute succession partition and reassign on-chain title deed to verified primary heir.
     */
    function executeSuccessionPartition(uint256 _caseId) external onlyRole(AUTHORITY_ROLE) nonReentrant {
        SuccessionCase storage sCase = cases[_caseId];
        require(sCase.caseId != 0, "Case does not exist");
        require(sCase.status == CaseStatus.APPROVED, "Case not approved");

        address currentOwner = landNFT.ownerOf(sCase.tokenId);
        require(currentOwner == sCase.deceasedOwner, "Token owner mismatch");

        sCase.status = CaseStatus.EXECUTED;
        sCase.executedAt = block.timestamp;

        // Force transfer on LandNFT
        landNFT.forceTransfer(
            sCase.tokenId,
            sCase.deceasedOwner,
            sCase.primarySuccessor,
            "Succession Title Partition",
            sCase.deathCertificateHash
        );

        // Update LandRegistry master record
        if (address(landRegistry) != address(0)) {
            landRegistry.updatePropertyOwner(sCase.propertyCode, sCase.primarySuccessor);
        }

        emit SuccessionExecuted(_caseId, sCase.tokenId, sCase.primarySuccessor, block.timestamp);
    }

    /**
     * @notice Reject a contested or fraudulent succession petition.
     */
    function rejectSuccessionCase(uint256 _caseId, string calldata _reason) external onlyRole(AUTHORITY_ROLE) {
        SuccessionCase storage sCase = cases[_caseId];
        require(sCase.caseId != 0, "Case does not exist");
        require(sCase.status == CaseStatus.PENDING_REVIEW, "Case not pending");

        sCase.status = CaseStatus.REJECTED;
        sCase.officerRemarks = _reason;

        emit SuccessionRejected(_caseId, _reason);
    }

    /**
     * @notice Retrieve full succession case details.
     */
    function getSuccessionCase(uint256 _caseId) external view returns (SuccessionCase memory) {
        require(cases[_caseId].caseId != 0, "Case does not exist");
        return cases[_caseId];
    }

    /**
     * @notice Retrieve list of legal heirs for a case.
     */
    function getHeirsByCase(uint256 _caseId) external view returns (LegalHeir[] memory) {
        return caseHeirs[_caseId];
    }

    /**
     * @notice Retrieve all succession cases filed against a property token.
     */
    function getCasesByProperty(uint256 _tokenId) external view returns (uint256[] memory) {
        return propertyToCases[_tokenId];
    }
}
