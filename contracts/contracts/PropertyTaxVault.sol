// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PropertyTaxVault
 * @notice Official on-chain Municipal Property Tax & NOC Clearance Vault for DigiVerify.
 * Records annual property tax assessments, tracks payment settlements, issues on-chain
 * Tax Clearance Certificates (NOC), and prevents property transfers with unpaid arrears.
 */
contract PropertyTaxVault is AccessControl, ReentrancyGuard {
    bytes32 public constant MUNICIPAL_OFFICER_ROLE = keccak256("MUNICIPAL_OFFICER_ROLE");
    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");

    struct TaxAssessment {
        uint256 assessmentId;
        uint256 tokenId;
        string propertyCode;
        uint256 financialYear; // e.g. 20252026 for FY 2025-26
        uint256 baseTaxAmount;
        uint256 cessAmount;
        uint256 penaltyAmount;
        uint256 totalDue;
        uint256 paidAmount;
        bool isCleared;
        uint256 assessedAt;
        uint256 paymentTimestamp;
        string paymentReceiptHash;
        address paidBy;
    }

    struct TaxClearanceNOC {
        uint256 tokenId;
        string propertyCode;
        uint256 financialYear;
        uint256 validUntil;
        address issuedBy;
        string certificateHash;
        bool isRevoked;
    }

    uint256 public assessmentCount;
    mapping(uint256 => TaxAssessment) public assessments;
    mapping(uint256 => uint256[]) public propertyToAssessments;
    mapping(uint256 => TaxClearanceNOC) public activeNOCs; // tokenId -> latest NOC

    address payable public municipalTreasury;

    event TaxAssessed(
        uint256 indexed assessmentId,
        uint256 indexed tokenId,
        string propertyCode,
        uint256 financialYear,
        uint256 totalDue
    );

    event TaxPaid(
        uint256 indexed assessmentId,
        uint256 indexed tokenId,
        uint256 amountPaid,
        string receiptHash,
        address indexed payer
    );

    event TaxClearanceIssued(
        uint256 indexed tokenId,
        string propertyCode,
        uint256 financialYear,
        uint256 validUntil,
        string certificateHash
    );

    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    constructor(address payable _municipalTreasury) {
        require(_municipalTreasury != address(0), "Invalid treasury address");
        municipalTreasury = _municipalTreasury;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MUNICIPAL_OFFICER_ROLE, msg.sender);
        _grantRole(AUTHORITY_ROLE, msg.sender);
    }

    function setMunicipalTreasury(address payable _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newTreasury != address(0), "Invalid treasury address");
        address oldTreasury = municipalTreasury;
        municipalTreasury = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    /**
     * @notice Municipal officer records an annual property tax assessment.
     */
    function recordAssessment(
        uint256 _tokenId,
        string calldata _propertyCode,
        uint256 _financialYear,
        uint256 _baseTaxAmount,
        uint256 _cessAmount,
        uint256 _penaltyAmount
    ) external onlyRole(MUNICIPAL_OFFICER_ROLE) returns (uint256) {
        require(_tokenId > 0, "Invalid token ID");
        require(bytes(_propertyCode).length > 0, "Property code required");
        require(_baseTaxAmount > 0, "Base tax must be > 0");

        uint256 totalDue = _baseTaxAmount + _cessAmount + _penaltyAmount;
        assessmentCount++;
        uint256 newId = assessmentCount;

        assessments[newId] = TaxAssessment({
            assessmentId: newId,
            tokenId: _tokenId,
            propertyCode: _propertyCode,
            financialYear: _financialYear,
            baseTaxAmount: _baseTaxAmount,
            cessAmount: _cessAmount,
            penaltyAmount: _penaltyAmount,
            totalDue: totalDue,
            paidAmount: 0,
            isCleared: false,
            assessedAt: block.timestamp,
            paymentTimestamp: 0,
            paymentReceiptHash: "",
            paidBy: address(0)
        });

        propertyToAssessments[_tokenId].push(newId);

        emit TaxAssessed(newId, _tokenId, _propertyCode, _financialYear, totalDue);
        return newId;
    }

    /**
     * @notice Settle property tax assessment with proof of payment / receipt hash.
     */
    function payTaxReceipt(
        uint256 _assessmentId,
        string calldata _paymentReceiptHash
    ) external payable nonReentrant {
        TaxAssessment storage assessment = assessments[_assessmentId];
        require(assessment.assessmentId != 0, "Assessment does not exist");
        require(!assessment.isCleared, "Tax already cleared");
        require(bytes(_paymentReceiptHash).length > 0, "Receipt hash required");

        assessment.paidAmount = assessment.totalDue;
        assessment.isCleared = true;
        assessment.paymentTimestamp = block.timestamp;
        assessment.paymentReceiptHash = _paymentReceiptHash;
        assessment.paidBy = msg.sender;

        if (msg.value > 0) {
            (bool sent, ) = municipalTreasury.call{value: msg.value}("");
            require(sent, "Treasury transfer failed");
        }

        emit TaxPaid(_assessmentId, assessment.tokenId, assessment.totalDue, _paymentReceiptHash, msg.sender);
    }

    /**
     * @notice Issue official on-chain Municipal Tax Clearance Certificate (NOC).
     */
    function issueTaxClearanceNOC(
        uint256 _tokenId,
        string calldata _propertyCode,
        uint256 _financialYear,
        uint256 _validityDurationSeconds,
        string calldata _certificateHash
    ) external onlyRole(MUNICIPAL_OFFICER_ROLE) {
        require(_tokenId > 0, "Invalid token ID");
        require(bytes(_certificateHash).length > 0, "Certificate hash required");

        uint256 validUntil = block.timestamp + _validityDurationSeconds;

        activeNOCs[_tokenId] = TaxClearanceNOC({
            tokenId: _tokenId,
            propertyCode: _propertyCode,
            financialYear: _financialYear,
            validUntil: validUntil,
            issuedBy: msg.sender,
            certificateHash: _certificateHash,
            isRevoked: false
        });

        emit TaxClearanceIssued(_tokenId, _propertyCode, _financialYear, validUntil, _certificateHash);
    }

    /**
     * @notice Check if a property is fully tax compliant (no pending uncleared assessments and valid NOC).
     */
    function verifyTaxCompliance(uint256 _tokenId) external view returns (bool isCompliant, uint256 totalPendingDues) {
        uint256[] memory list = propertyToAssessments[_tokenId];
        uint256 pending = 0;
        for (uint256 i = 0; i < list.length; i++) {
            if (!assessments[list[i]].isCleared) {
                pending += (assessments[list[i]].totalDue - assessments[list[i]].paidAmount);
            }
        }
        bool validNoc = (activeNOCs[_tokenId].validUntil >= block.timestamp && !activeNOCs[_tokenId].isRevoked);
        return (pending == 0 && validNoc, pending);
    }

    /**
     * @notice Retrieve all assessments for a property.
     */
    function getAssessmentsByProperty(uint256 _tokenId) external view returns (uint256[] memory) {
        return propertyToAssessments[_tokenId];
    }

    /**
     * @notice Retrieve single assessment details.
     */
    function getAssessment(uint256 _assessmentId) external view returns (TaxAssessment memory) {
        require(assessments[_assessmentId].assessmentId != 0, "Assessment does not exist");
        return assessments[_assessmentId];
    }
}
