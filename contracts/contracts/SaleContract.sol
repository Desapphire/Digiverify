// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ILandRegistry {
    function propertyRecords(string calldata _propertyCode) external view returns (
        address owner,
        string memory propertyCode,
        string memory documentHash,
        bool isEncumbered,
        uint8 status,
        uint256 tokenId,
        bool exists
    );
}

/**
 * @title SaleContract
 * @notice Multi-signature government-grade land sale workflow.
 */
contract SaleContract is AccessControl, ReentrancyGuard {

    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");
    bytes32 public constant BANK_ROLE      = keccak256("BANK_ROLE");

    IERC721 public landNFT;
    ILandRegistry public landRegistry;

    enum SaleStatus { INITIATED, BUYER_SIGNED, FUNDS_BLOCKED, AUTHORITY_APPROVED, COMPLETED, CANCELLED, FROZEN }

    struct Sale {
        uint256   tokenId;
        string    propertyCode;
        address   seller;
        address   buyer;
        uint256   price;
        SaleStatus status;
        bool      sellerSigned;
        bool      buyerSigned;
        bool      fundsBlocked;
        bool      authoritySigned;
        uint256   createdAt;
    }

    uint256 public saleCount;
    mapping(uint256 => Sale) public sales;

    event SaleInitiated(uint256 indexed saleId, string propertyCode, address indexed seller, address indexed buyer);
    event BuyerSigned(uint256 indexed saleId);
    event FundsBlocked(uint256 indexed saleId);
    event AuthorityApproved(uint256 indexed saleId);
    event SaleCompleted(uint256 indexed saleId);
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
     * @notice Initiate a sale. Seller must sign immediately.
     * @dev Added _seller parameter to support gasless initiation by AUTHORITY_ROLE.
     */
    function initiateSale(
        uint256 _tokenId,
        string calldata _propertyCode,
        address _seller,
        address _buyer,
        uint256 _price
    ) external returns (uint256) {
        address actualOwner = landNFT.ownerOf(_tokenId);
        require(actualOwner == _seller, "Seller is not the NFT owner");
        
        // Either the owner initiates it, or the Authority initiates it on behalf of the owner
        require(
            msg.sender == actualOwner || hasRole(AUTHORITY_ROLE, msg.sender),
            "Caller is not owner or authority"
        );
        
        // Check encumbrance
        (,,,bool isEncumbered,,,) = landRegistry.propertyRecords(_propertyCode);
        require(!isEncumbered, "Property is encumbered and cannot be sold");

        uint256 saleId = ++saleCount;
        sales[saleId] = Sale({
            tokenId: _tokenId,
            propertyCode: _propertyCode,
            seller: _seller,
            buyer: _buyer,
            price: _price,
            status: SaleStatus.INITIATED,
            sellerSigned: true,
            buyerSigned: false,
            fundsBlocked: false,
            authoritySigned: false,
            createdAt: block.timestamp
        });

        emit SaleInitiated(saleId, _propertyCode, _seller, _buyer);
        return saleId;
    }

    /**
     * @notice Buyer signs the sale.
     */
    function buyerSign(uint256 _saleId) external {
        Sale storage s = sales[_saleId];
        require(s.status == SaleStatus.INITIATED, "Invalid status");
        
        // Either the buyer signs it, or the Authority signs it after verifying off-chain proof
        require(
            msg.sender == s.buyer || hasRole(AUTHORITY_ROLE, msg.sender),
            "Not the buyer or authority"
        );

        s.buyerSigned = true;
        s.status = SaleStatus.BUYER_SIGNED;
        emit BuyerSigned(_saleId);
    }

    /**
     * @notice Bank confirms funds are blocked (ASBA-style).
     */
    function confirmFundsBlocked(uint256 _saleId) external onlyRole(BANK_ROLE) {
        Sale storage s = sales[_saleId];
        require(s.status == SaleStatus.BUYER_SIGNED, "Invalid status");
        require(s.buyerSigned, "Buyer hasn't signed");

        s.fundsBlocked = true;
        s.status = SaleStatus.FUNDS_BLOCKED;
        emit FundsBlocked(_saleId);
    }

    /**
     * @notice Authority approves the sale after verification.
     */
    function authorityApprove(uint256 _saleId) external onlyRole(AUTHORITY_ROLE) {
        Sale storage s = sales[_saleId];
        require(s.status == SaleStatus.FUNDS_BLOCKED, "Funds must be blocked first");

        s.authoritySigned = true;
        s.status = SaleStatus.AUTHORITY_APPROVED;
        emit AuthorityApproved(_saleId);
    }

    /**
     * @notice Execute the transfer once all signatures are present.
     */
    function executeTransfer(uint256 _saleId) external nonReentrant {
        Sale storage s = sales[_saleId];
        require(s.status == SaleStatus.AUTHORITY_APPROVED, "Not approved by authority");
        require(s.sellerSigned && s.buyerSigned && s.fundsBlocked && s.authoritySigned, "Signatures incomplete");

        s.status = SaleStatus.COMPLETED;

        // Perform NFT Transfer
        // Note: Seller must have approved this contract as an operator for the NFT
        landNFT.transferFrom(s.seller, s.buyer, s.tokenId);

        emit SaleCompleted(_saleId);
    }

    /**
     * @notice Cancel a transaction (Admin/Authority/Seller/Buyer if applicable).
     */
    function cancelTransaction(uint256 _saleId, string calldata _reason) external {
        Sale storage s = sales[_saleId];
        require(s.status != SaleStatus.COMPLETED, "Already completed");
        require(
            hasRole(AUTHORITY_ROLE, msg.sender) || 
            msg.sender == s.seller || 
            msg.sender == s.buyer, 
            "Unauthorized"
        );

        s.status = SaleStatus.CANCELLED;
        emit SaleCancelled(_saleId, _reason);
    }

    /**
     * @notice Court or Admin forces a freeze on the transaction.
     */
    function freezeTransaction(uint256 _saleId, string calldata _reason) external onlyRole(AUTHORITY_ROLE) {
        sales[_saleId].status = SaleStatus.FROZEN;
        emit SaleFrozen(_saleId, _reason);
    }
}
