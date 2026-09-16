// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ILandRegistry {
    function propertyRecords(string calldata _propertyCode) external view returns (
        string memory propertyCode,
        string memory surveyNumber,
        string memory surveyDetails,
        string memory district,
        string memory state,
        uint256 areaSqft,
        string memory coordinates,
        address originalOwner,
        address currentOwner,
        string memory documentHash,
        bool isEncumbered,
        string memory encumbranceReason,
        uint256 estimatedFairPrice,
        uint8 status,
        uint256 tokenId,
        uint256 registeredAt,
        uint256 approvedAt,
        bool exists
    );

    function updatePropertyOwner(string calldata _propertyCode, address _newOwner) external;
}

/**
 * @title SaleContract
 * @notice Multi-signature government-grade land sale & escrow workflow contract.
 *         Tracks seller/buyer signing, ASBA bank liens, revenue stamp duty/registration fee calculations, and title transfer.
 */
contract SaleContract is AccessControl, ReentrancyGuard {

    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");
    bytes32 public constant BANK_ROLE      = keccak256("BANK_ROLE");

    IERC721 public landNFT;
    ILandRegistry public landRegistry;

    enum SaleStatus {
        INITIATED,
        BUYER_SIGNED,
        FUNDS_BLOCKED,
        AUTHORITY_APPROVED,
        COMPLETED,
        CANCELLED,
        FROZEN
    }

    struct Sale {
        uint256    saleId;
        uint256    tokenId;
        string     propertyCode;
        address    seller;
        address    buyer;
        uint256    price;              // Agreed Sale Price (INR / Wei)
        uint256    stampDuty;          // Calculated Stamp Duty (e.g. 5.6%)
        uint256    registrationFee;    // Calculated Registration Fee (e.g. 1.0%)
        string     bankReferenceId;    // ASBA Bank Lien Reference ID (e.g. SBI-ASBA-2026-8941)
        uint256    bankBlockedAmount;  // Amount blocked by Bank Admin
        SaleStatus status;
        bool       sellerSigned;
        bool       buyerSigned;
        bool       fundsBlocked;
        bool       authorityApproved;
        uint256    createdAt;
        uint256    completedAt;
    }

    uint256 public saleCount;
    mapping(uint256 => Sale) public sales;

    event SaleInitiated(
        uint256 indexed saleId,
        string propertyCode,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 stampDuty,
        uint256 registrationFee
    );

    event BuyerSigned(uint256 indexed saleId, address indexed buyer);
    event BankLienConfirmed(uint256 indexed saleId, string bankReferenceId, uint256 amount);
    event BankLienReleased(uint256 indexed saleId, string reason);
    event AuthorityApproved(uint256 indexed saleId, address indexed authority);
    event SaleCompleted(uint256 indexed saleId, uint256 indexed tokenId, address seller, address indexed buyer, uint256 price);
    event SaleCancelled(uint256 indexed saleId, string reason);
    event SaleFrozen(uint256 indexed saleId, string reason);

    constructor(address _landNFT, address _landRegistry) {
        landNFT = IERC721(_landNFT);
        landRegistry = ILandRegistry(_landRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUTHORITY_ROLE, msg.sender);
        _grantRole(BANK_ROLE, msg.sender);
    }

    /**
     * @notice Initiate a sale with detailed revenue calculation matching database.
     */
    function initiateSaleWithRevenue(
        uint256 _tokenId,
        string calldata _propertyCode,
        address _seller,
        address _buyer,
        uint256 _price,
        uint256 _stampDuty,
        uint256 _registrationFee
    ) external returns (uint256) {
        address actualOwner = landNFT.ownerOf(_tokenId);
        require(actualOwner == _seller, "Seller is not the NFT owner");
        require(_buyer != address(0) && _buyer != _seller, "Invalid buyer address");

        // Either the owner initiates it, or the Authority initiates it on behalf of the owner
        require(
            msg.sender == actualOwner || hasRole(AUTHORITY_ROLE, msg.sender),
            "Caller is not owner or authority"
        );

        // Verify property is not encumbered
        (,,,,,,,,,,bool isEncumbered,,,,,,,) = landRegistry.propertyRecords(_propertyCode);
        require(!isEncumbered, "Property is encumbered and cannot be sold");

        uint256 saleId = ++saleCount;
        sales[saleId] = Sale({
            saleId: saleId,
            tokenId: _tokenId,
            propertyCode: _propertyCode,
            seller: _seller,
            buyer: _buyer,
            price: _price,
            stampDuty: _stampDuty,
            registrationFee: _registrationFee,
            bankReferenceId: "",
            bankBlockedAmount: 0,
            status: SaleStatus.INITIATED,
            sellerSigned: true,
            buyerSigned: false,
            fundsBlocked: false,
            authorityApproved: false,
            createdAt: block.timestamp,
            completedAt: 0
        });

        emit SaleInitiated(saleId, _propertyCode, _seller, _buyer, _price, _stampDuty, _registrationFee);
        return saleId;
    }

    /**
     * @notice Backward-compatible initiateSale wrapper.
     */
    function initiateSale(
        uint256 _tokenId,
        string calldata _propertyCode,
        address _seller,
        address _buyer,
        uint256 _price
    ) external returns (uint256) {
        uint256 stampDuty = (_price * 56) / 1000;      // 5.6%
        uint256 regFee = (_price * 10) / 1000;         // 1.0%
        
        address actualOwner = landNFT.ownerOf(_tokenId);
        require(actualOwner == _seller, "Seller is not the NFT owner");
        require(
            msg.sender == actualOwner || hasRole(AUTHORITY_ROLE, msg.sender),
            "Caller is not owner or authority"
        );

        (,,,,,,,,,,bool isEncumbered,,,,,,,) = landRegistry.propertyRecords(_propertyCode);
        require(!isEncumbered, "Property is encumbered and cannot be sold");

        uint256 saleId = ++saleCount;
        sales[saleId] = Sale({
            saleId: saleId,
            tokenId: _tokenId,
            propertyCode: _propertyCode,
            seller: _seller,
            buyer: _buyer,
            price: _price,
            stampDuty: stampDuty,
            registrationFee: regFee,
            bankReferenceId: "",
            bankBlockedAmount: 0,
            status: SaleStatus.INITIATED,
            sellerSigned: true,
            buyerSigned: false,
            fundsBlocked: false,
            authorityApproved: false,
            createdAt: block.timestamp,
            completedAt: 0
        });

        emit SaleInitiated(saleId, _propertyCode, _seller, _buyer, _price, stampDuty, regFee);
        return saleId;
    }

    /**
     * @notice Buyer cryptographically signs the sale agreement.
     */
    function buyerSign(uint256 _saleId) external {
        Sale storage s = sales[_saleId];
        require(s.status == SaleStatus.INITIATED, "Invalid sale status");
        require(
            msg.sender == s.buyer || hasRole(AUTHORITY_ROLE, msg.sender),
            "Caller is not buyer or authority"
        );

        s.buyerSigned = true;
        s.status = SaleStatus.BUYER_SIGNED;
        emit BuyerSigned(_saleId, s.buyer);
    }

    /**
     * @notice Bank Admin confirms ASBA fund block / Bank Lien with reference ID.
     */
    function confirmFundsBlockedWithRef(uint256 _saleId, string calldata _bankRefId, uint256 _amount) external onlyRole(BANK_ROLE) {
        Sale storage s = sales[_saleId];
        require(s.status == SaleStatus.BUYER_SIGNED, "Buyer must sign first");

        s.fundsBlocked = true;
        s.bankReferenceId = _bankRefId;
        s.bankBlockedAmount = _amount;
        s.status = SaleStatus.FUNDS_BLOCKED;

        emit BankLienConfirmed(_saleId, _bankRefId, _amount);
    }

    /**
     * @notice Backward-compatible confirmFundsBlocked wrapper.
     */
    function confirmFundsBlocked(uint256 _saleId) external onlyRole(BANK_ROLE) {
        Sale storage s = sales[_saleId];
        require(s.status == SaleStatus.BUYER_SIGNED, "Buyer must sign first");

        s.fundsBlocked = true;
        s.bankBlockedAmount = s.price;
        s.status = SaleStatus.FUNDS_BLOCKED;

        emit BankLienConfirmed(_saleId, "ASBA-CONFIRMED", s.price);
    }

    /**
     * @notice Government Authority officially approves the sale after verification.
     */
    function authorityApprove(uint256 _saleId) external onlyRole(AUTHORITY_ROLE) {
        Sale storage s = sales[_saleId];
        require(s.status == SaleStatus.FUNDS_BLOCKED, "Bank funds must be blocked first");

        s.authorityApproved = true;
        s.status = SaleStatus.AUTHORITY_APPROVED;
        emit AuthorityApproved(_saleId, msg.sender);
    }

    /**
     * @notice Execute final title transfer and update on-chain Land Registry.
     */
    function executeTransfer(uint256 _saleId) external nonReentrant {
        Sale storage s = sales[_saleId];
        require(s.status == SaleStatus.AUTHORITY_APPROVED, "Sale not yet approved by authority");
        require(s.sellerSigned && s.buyerSigned && s.fundsBlocked && s.authorityApproved, "Multi-party signatures incomplete");

        s.status = SaleStatus.COMPLETED;
        s.completedAt = block.timestamp;

        // 1. Transfer Land NFT Title to buyer
        landNFT.transferFrom(s.seller, s.buyer, s.tokenId);

        // 2. Update current legal owner in LandRegistry contract
        try landRegistry.updatePropertyOwner(s.propertyCode, s.buyer) {} catch {}

        emit SaleCompleted(_saleId, s.tokenId, s.seller, s.buyer, s.price);
    }

    /**
     * @notice Cancel transaction (Authority / Seller / Buyer).
     */
    function cancelTransaction(uint256 _saleId, string calldata _reason) external {
        Sale storage s = sales[_saleId];
        require(s.status != SaleStatus.COMPLETED, "Cannot cancel completed sale");
        require(
            hasRole(AUTHORITY_ROLE, msg.sender) || 
            msg.sender == s.seller || 
            msg.sender == s.buyer, 
            "Unauthorized to cancel"
        );

        s.status = SaleStatus.CANCELLED;
        emit SaleCancelled(_saleId, _reason);
    }

    /**
     * @notice Freeze transaction under judicial dispute or investigation.
     */
    function freezeTransaction(uint256 _saleId, string calldata _reason) external onlyRole(AUTHORITY_ROLE) {
        Sale storage s = sales[_saleId];
        require(s.status != SaleStatus.COMPLETED, "Sale already completed");
        s.status = SaleStatus.FROZEN;
        emit SaleFrozen(_saleId, _reason);
    }

    /**
     * @notice Fetch full sale details.
     */
    function getSale(uint256 _saleId) external view returns (Sale memory) {
        return sales[_saleId];
    }
}
