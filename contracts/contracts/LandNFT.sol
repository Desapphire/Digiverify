// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LandNFT
 * @notice Sovereign ERC-721 token representing legal land title deeds.
 *         Stores on-chain metadata including First Owner, Survey Number, Plot Area, and Court Injunction status.
 */
contract LandNFT is ERC721, ERC721URIStorage, AccessControl, Pausable {

    bytes32 public constant MINTER_ROLE        = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE         = keccak256("ADMIN_ROLE");
    bytes32 public constant COURT_ROLE         = keccak256("COURT_ROLE");
    bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE_CONTRACT_ROLE");

    struct PropertyNFTData {
        string  propertyCode;
        string  surveyNumber;
        address firstOwner;
        uint256 areaSqft;
        uint256 mintedAt;
        bool    isFrozen;
        string  freezeReason;
        string  courtCaseNumber;
    }

    // tokenId => PropertyNFTData
    mapping(uint256 => PropertyNFTData) public nftData;

    event LandMinted(
        address indexed to,
        uint256 indexed tokenId,
        string propertyCode,
        string surveyNumber,
        address indexed firstOwner
    );

    event PropertyFrozen(uint256 indexed tokenId, string reason, string courtCaseNumber);
    event PropertyUnfrozen(uint256 indexed tokenId, string reason);
    event ForceTransfer(uint256 indexed tokenId, address indexed from, address indexed to, string reason, string courtOrderHash);

    constructor() ERC721("DigiVerify Land Registry NFT", "LAND-NFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(COURT_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @notice Mint a new land title NFT with rich on-chain metadata.
     */
    function mintPropertyWithDetails(
        address to,
        uint256 tokenId,
        string calldata propertyCode,
        string calldata surveyNumber,
        uint256 areaSqft,
        string calldata metadataURI
    ) external onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        nftData[tokenId] = PropertyNFTData({
            propertyCode: propertyCode,
            surveyNumber: surveyNumber,
            firstOwner: to,
            areaSqft: areaSqft,
            mintedAt: block.timestamp,
            isFrozen: false,
            freezeReason: "",
            courtCaseNumber: ""
        });

        emit LandMinted(to, tokenId, propertyCode, surveyNumber, to);
    }

    /**
     * @notice Backward-compatible standard minting.
     */
    function mintProperty(
        address to,
        uint256 tokenId,
        string calldata metadataURI
    ) external onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        nftData[tokenId] = PropertyNFTData({
            propertyCode: "",
            surveyNumber: "",
            firstOwner: to,
            areaSqft: 0,
            mintedAt: block.timestamp,
            isFrozen: false,
            freezeReason: "",
            courtCaseNumber: ""
        });

        emit LandMinted(to, tokenId, "", "", to);
    }

    /**
     * @notice Freeze a property due to dispute or legal injunction.
     */
    function freezeProperty(uint256 tokenId, string calldata reason) external onlyRole(COURT_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        nftData[tokenId].isFrozen = true;
        nftData[tokenId].freezeReason = reason;
        emit PropertyFrozen(tokenId, reason, "");
    }

    /**
     * @notice Freeze property with specific court case number.
     */
    function freezePropertyWithCase(uint256 tokenId, string calldata reason, string calldata caseNumber) external onlyRole(COURT_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        nftData[tokenId].isFrozen = true;
        nftData[tokenId].freezeReason = reason;
        nftData[tokenId].courtCaseNumber = caseNumber;
        emit PropertyFrozen(tokenId, reason, caseNumber);
    }

    /**
     * @notice Unfreeze a property once dispute is resolved.
     */
    function unfreezeProperty(uint256 tokenId) external onlyRole(COURT_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        nftData[tokenId].isFrozen = false;
        nftData[tokenId].freezeReason = "";
        nftData[tokenId].courtCaseNumber = "";
        emit PropertyUnfrozen(tokenId, "Judicial freeze lifted");
    }

    /**
     * @notice Judicial force-transfer ownership bypassing normal approvals (Court Order).
     */
    function forceTransfer(
        address from,
        address to,
        uint256 tokenId,
        string calldata reason
    ) external onlyRole(COURT_ROLE) {
        _transfer(from, to, tokenId);
        emit ForceTransfer(tokenId, from, to, reason, "");
    }

    /**
     * @notice Judicial force-transfer with official court order hash.
     */
    function forceTransferWithCase(
        address from,
        address to,
        uint256 tokenId,
        string calldata reason,
        string calldata courtOrderHash
    ) external onlyRole(COURT_ROLE) {
        _transfer(from, to, tokenId);
        emit ForceTransfer(tokenId, from, to, reason, courtOrderHash);
    }

    /**
     * @notice Check if a token is frozen.
     */
    function isFrozen(uint256 tokenId) external view returns (bool) {
        return nftData[tokenId].isFrozen;
    }

    /**
     * @notice Get complete NFT on-chain details.
     */
    function getPropertyNFTDetails(uint256 tokenId) external view returns (PropertyNFTData memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return nftData[tokenId];
    }

    /**
     * @dev Authorization check to allow SaleContract to move tokens without manual approval per sale.
     */
    function _isAuthorized(address owner, address spender, uint256 tokenId) internal view virtual override returns (bool) {
        return super._isAuthorized(owner, spender, tokenId) || hasRole(SALE_CONTRACT_ROLE, spender);
    }

    /**
     * @dev Block transfers if property is frozen under judicial dispute.
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        require(!nftData[tokenId].isFrozen, "Property title is frozen under judicial dispute");
        return super._update(to, tokenId, auth);
    }

    // ── Overrides ───────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
