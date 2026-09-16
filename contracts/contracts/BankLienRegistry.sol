// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BankLienRegistry
 * @notice Official on-chain Mortgage & Bank Hypothecation Registry for DigiVerify.
 * Enables scheduled commercial banks (SBI, HDFC, ICICI, etc.) to record, track,
 * and release institutional mortgage liens, ASBA loan encumbrances, and NOCs.
 */
contract BankLienRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");
    bytes32 public constant BANK_ROLE = keccak256("BANK_ROLE");

    enum LienStatus {
        ACTIVE,      // 0: Active hypothecation / loan hold
        SATISFIED,   // 1: Fully repaid & NOC issued
        FORECLOSED,  // 2: Judicial foreclosure underway
        RELEASED     // 3: Authority released
    }

    struct BankLien {
        uint256 lienId;
        uint256 tokenId;
        string propertyCode;
        string bankName;
        string bankBranch;
        string loanAccountNumber;
        uint256 sanctionedAmount;
        uint256 outstandingBalance;
        address borrowerAddress;
        address bankOfficerWallet;
        string sanctionLetterHash;
        string nocDocumentHash;
        LienStatus status;
        uint256 createdAt;
        uint256 releasedAt;
    }

    uint256 public lienCount;
    mapping(uint256 => BankLien) public liens;
    mapping(uint256 => uint256[]) public propertyToLiens;
    mapping(string => uint256) public loanAccountToLienId;

    event LienCreated(
        uint256 indexed lienId,
        uint256 indexed tokenId,
        string propertyCode,
        string bankName,
        string loanAccountNumber,
        uint256 sanctionedAmount,
        address indexed borrowerAddress
    );

    event BalanceUpdated(
        uint256 indexed lienId,
        uint256 previousBalance,
        uint256 newBalance,
        uint256 updatedAt
    );

    event LienReleased(
        uint256 indexed lienId,
        uint256 indexed tokenId,
        string nocDocumentHash,
        string remarks,
        uint256 releasedAt
    );

    event LienForeclosed(
        uint256 indexed lienId,
        uint256 indexed tokenId,
        string courtOrderHash,
        string remarks,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUTHORITY_ROLE, msg.sender);
        _grantRole(BANK_ROLE, msg.sender);
    }

    /**
     * @notice Register a new institutional mortgage lien on a property parcel.
     */
    function createLien(
        uint256 _tokenId,
        string calldata _propertyCode,
        string calldata _bankName,
        string calldata _bankBranch,
        string calldata _loanAccountNumber,
        uint256 _sanctionedAmount,
        address _borrowerAddress,
        string calldata _sanctionLetterHash
    ) external onlyRole(BANK_ROLE) nonReentrant returns (uint256) {
        require(_tokenId > 0, "Invalid token ID");
        require(bytes(_propertyCode).length > 0, "Property code required");
        require(bytes(_loanAccountNumber).length > 0, "Loan account number required");
        require(_sanctionedAmount > 0, "Sanctioned amount must be > 0");
        require(_borrowerAddress != address(0), "Invalid borrower address");
        require(loanAccountToLienId[_loanAccountNumber] == 0, "Loan account already registered");

        lienCount++;
        uint256 newLienId = lienCount;

        liens[newLienId] = BankLien({
            lienId: newLienId,
            tokenId: _tokenId,
            propertyCode: _propertyCode,
            bankName: _bankName,
            bankBranch: _bankBranch,
            loanAccountNumber: _loanAccountNumber,
            sanctionedAmount: _sanctionedAmount,
            outstandingBalance: _sanctionedAmount,
            borrowerAddress: _borrowerAddress,
            bankOfficerWallet: msg.sender,
            sanctionLetterHash: _sanctionLetterHash,
            nocDocumentHash: "",
            status: LienStatus.ACTIVE,
            createdAt: block.timestamp,
            releasedAt: 0
        });

        propertyToLiens[_tokenId].push(newLienId);
        loanAccountToLienId[_loanAccountNumber] = newLienId;

        emit LienCreated(
            newLienId,
            _tokenId,
            _propertyCode,
            _bankName,
            _loanAccountNumber,
            _sanctionedAmount,
            _borrowerAddress
        );

        return newLienId;
    }

    /**
     * @notice Update current outstanding loan balance.
     */
    function updateOutstandingBalance(
        uint256 _lienId,
        uint256 _newBalance
    ) external onlyRole(BANK_ROLE) {
        BankLien storage lien = liens[_lienId];
        require(lien.lienId != 0, "Lien does not exist");
        require(lien.status == LienStatus.ACTIVE, "Lien is not active");

        uint256 oldBalance = lien.outstandingBalance;
        lien.outstandingBalance = _newBalance;

        emit BalanceUpdated(_lienId, oldBalance, _newBalance, block.timestamp);
    }

    /**
     * @notice Release mortgage lien upon loan repayment and issue on-chain Bank NOC.
     */
    function releaseLienWithNOC(
        uint256 _lienId,
        string calldata _nocDocumentHash,
        string calldata _remarks
    ) external nonReentrant {
        require(
            hasRole(BANK_ROLE, msg.sender) || hasRole(AUTHORITY_ROLE, msg.sender),
            "Caller cannot release lien"
        );

        BankLien storage lien = liens[_lienId];
        require(lien.lienId != 0, "Lien does not exist");
        require(lien.status == LienStatus.ACTIVE, "Lien not active");
        require(bytes(_nocDocumentHash).length > 0, "NOC document hash required");

        lien.status = LienStatus.SATISFIED;
        lien.nocDocumentHash = _nocDocumentHash;
        lien.outstandingBalance = 0;
        lien.releasedAt = block.timestamp;

        emit LienReleased(_lienId, lien.tokenId, _nocDocumentHash, _remarks, block.timestamp);
    }

    /**
     * @notice Mark mortgage lien under judicial foreclosure.
     */
    function forecloseLien(
        uint256 _lienId,
        string calldata _courtOrderHash,
        string calldata _remarks
    ) external onlyRole(AUTHORITY_ROLE) {
        BankLien storage lien = liens[_lienId];
        require(lien.lienId != 0, "Lien does not exist");
        require(lien.status == LienStatus.ACTIVE, "Lien not active");

        lien.status = LienStatus.FORECLOSED;

        emit LienForeclosed(_lienId, lien.tokenId, _courtOrderHash, _remarks, block.timestamp);
    }

    /**
     * @notice Check if a land parcel token has any active mortgage liens.
     */
    function hasActiveLien(uint256 _tokenId) external view returns (bool) {
        uint256[] memory lienIds = propertyToLiens[_tokenId];
        for (uint256 i = 0; i < lienIds.length; i++) {
            if (liens[lienIds[i]].status == LienStatus.ACTIVE) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Retrieve all lien IDs associated with a property token.
     */
    function getLiensByProperty(uint256 _tokenId) external view returns (uint256[] memory) {
        return propertyToLiens[_tokenId];
    }

    /**
     * @notice Retrieve full bank lien record by ID.
     */
    function getLien(uint256 _lienId) external view returns (BankLien memory) {
        require(liens[_lienId].lienId != 0, "Lien does not exist");
        return liens[_lienId];
    }
}
