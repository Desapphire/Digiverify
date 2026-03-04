// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title SaleContract
 * @notice Multi-signature sale workflow for land properties.
 *         States: INITIATED → APPROVED → COMPLETED | CANCELLED
 *         Authority must approve before completion.
 *         Completion triggers NFT transfer from seller to buyer.
 */
contract SaleContract is AccessControl {

    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");

    IERC721 public landNFT;

    enum SaleStatus { INITIATED, APPROVED, COMPLETED, CANCELLED }

    struct Sale {
        uint256   tokenId;
        address   seller;
        address   buyer;
        uint256   price;
        SaleStatus status;
        bool      sellerSigned;
        bool      buyerSigned;
        uint256   createdAt;
    }

    uint256 public saleCount;
    mapping(uint256 => Sale) public sales;

    event SaleInitiated(
        uint256 indexed saleId,
        address indexed seller,
        address indexed buyer,
        uint256 tokenId,
        uint256 price
    );

    event SaleSigned(uint256 indexed saleId, address indexed signer, string role);
    event SaleApproved(uint256 indexed saleId, address indexed authority);
    event SaleCompleted(uint256 indexed saleId, uint256 tokenId);
    event SaleCancelled(uint256 indexed saleId, address indexed cancelledBy);

    constructor(address _landNFT) {
        require(_landNFT != address(0), "Invalid NFT address");
        landNFT = IERC721(_landNFT);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUTHORITY_ROLE, msg.sender);
    }

    /**
     * @notice Initiate a new sale.
     * @param tokenId NFT token ID of the property.
     * @param seller  Current owner wallet.
     * @param buyer   Buyer wallet.
     * @param price   Sale price (in wei or smallest unit).
     * @return saleId The created sale ID.
     */
    function initiateSale(
        uint256 tokenId,
        address seller,
        address buyer,
        uint256 price
    ) external returns (uint256) {
        require(seller != address(0) && buyer != address(0), "Invalid addresses");
        require(seller != buyer, "Seller and buyer must differ");
        require(landNFT.ownerOf(tokenId) == seller, "Seller is not the owner");
        require(price > 0, "Price must be positive");

        uint256 saleId = ++saleCount;

        sales[saleId] = Sale({
            tokenId: tokenId,
            seller: seller,
            buyer: buyer,
            price: price,
            status: SaleStatus.INITIATED,
            sellerSigned: false,
            buyerSigned: false,
            createdAt: block.timestamp
        });

        emit SaleInitiated(saleId, seller, buyer, tokenId, price);
        return saleId;
    }

    /**
     * @notice Sign a sale (buyer or seller).
     */
    function signSale(uint256 saleId) external {
        Sale storage s = sales[saleId];
        require(s.status == SaleStatus.INITIATED, "Sale not in INITIATED state");

        if (msg.sender == s.seller) {
            require(!s.sellerSigned, "Seller already signed");
            s.sellerSigned = true;
            emit SaleSigned(saleId, msg.sender, "seller");
        } else if (msg.sender == s.buyer) {
            require(!s.buyerSigned, "Buyer already signed");
            s.buyerSigned = true;
            emit SaleSigned(saleId, msg.sender, "buyer");
        } else {
            revert("Not a party to this sale");
        }
    }

    /**
     * @notice Authority approves the sale.
     *         Both buyer and seller must have signed first.
     */
    function approveSale(uint256 saleId) external onlyRole(AUTHORITY_ROLE) {
        Sale storage s = sales[saleId];
        require(s.status == SaleStatus.INITIATED, "Sale not in INITIATED state");
        require(s.buyerSigned && s.sellerSigned, "Both parties must sign first");

        s.status = SaleStatus.APPROVED;
        emit SaleApproved(saleId, msg.sender);
    }

    /**
     * @notice Complete the sale — transfers NFT from seller to buyer.
     * @dev    Seller must have approved this contract to transfer the NFT
     *         (via landNFT.approve(saleContractAddress, tokenId)).
     */
    function completeSale(uint256 saleId) external {
        Sale storage s = sales[saleId];
        require(s.status == SaleStatus.APPROVED, "Sale must be APPROVED first");
        require(
            msg.sender == s.seller || msg.sender == s.buyer || hasRole(AUTHORITY_ROLE, msg.sender),
            "Not authorized to complete"
        );

        s.status = SaleStatus.COMPLETED;

        // Transfer NFT from seller to buyer
        landNFT.transferFrom(s.seller, s.buyer, s.tokenId);

        emit SaleCompleted(saleId, s.tokenId);
    }

    /**
     * @notice Cancel a sale. Only parties or authority can cancel.
     */
    function cancelSale(uint256 saleId) external {
        Sale storage s = sales[saleId];
        require(
            s.status == SaleStatus.INITIATED || s.status == SaleStatus.APPROVED,
            "Sale already completed or cancelled"
        );
        require(
            msg.sender == s.seller || msg.sender == s.buyer || hasRole(AUTHORITY_ROLE, msg.sender),
            "Not authorized to cancel"
        );

        s.status = SaleStatus.CANCELLED;
        emit SaleCancelled(saleId, msg.sender);
    }

    /**
     * @notice Get sale details.
     */
    function getSale(uint256 saleId)
        external view returns (
            uint256 tokenId, address seller, address buyer,
            uint256 price, SaleStatus status,
            bool sellerSigned, bool buyerSigned
        )
    {
        Sale storage s = sales[saleId];
        return (s.tokenId, s.seller, s.buyer, s.price, s.status, s.sellerSigned, s.buyerSigned);
    }
}
