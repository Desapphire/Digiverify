// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LandNFT
 * @notice ERC-721 token representing land ownership.
 *         Each property is minted as a unique NFT with a property code and metadata URI.
 *         Admin can force-transfer tokens (for court orders / wallet recovery).
 */
contract LandNFT is ERC721, ERC721URIStorage, AccessControl {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");

    uint256 private _nextTokenId;

    // propertyCode → tokenId
    mapping(string => uint256) public propertyTokenId;
    // tokenId → propertyCode
    mapping(uint256 => string) public tokenPropertyCode;

    event LandMinted(address indexed to, uint256 indexed tokenId, string propertyCode);
    event ForceTransfer(uint256 indexed tokenId, address indexed from, address indexed to);

    constructor() ERC721("Digiverify Land NFT", "DGLAND") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @notice Mint a new land NFT.
     * @param to           Owner wallet address.
     * @param propertyCode Unique property identifier (e.g. "MH-2026-00001").
     * @param metadataURI  IPFS URI for property metadata.
     * @return tokenId     The minted token ID.
     */
    function mintLand(
        address to,
        string calldata propertyCode,
        string calldata metadataURI
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(propertyTokenId[propertyCode] == 0, "Property already minted");
        require(bytes(propertyCode).length > 0, "Empty property code");

        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        propertyTokenId[propertyCode] = tokenId;
        tokenPropertyCode[tokenId] = propertyCode;

        emit LandMinted(to, tokenId, propertyCode);
        return tokenId;
    }

    /**
     * @notice Force-transfer a token (court order / wallet recovery).
     * @dev    Only ADMIN_ROLE can call this — bypasses approval checks.
     */
    function forceTransfer(
        uint256 tokenId,
        address newOwner
    ) external onlyRole(ADMIN_ROLE) {
        address currentOwner = ownerOf(tokenId);
        _transfer(currentOwner, newOwner, tokenId);
        emit ForceTransfer(tokenId, currentOwner, newOwner);
    }

    /**
     * @notice Get the token ID for a property code.
     */
    function getTokenByPropertyCode(string calldata propertyCode) external view returns (uint256) {
        uint256 tokenId = propertyTokenId[propertyCode];
        require(tokenId != 0, "Property not minted");
        return tokenId;
    }

    /**
     * @notice Total number of minted tokens.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
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
