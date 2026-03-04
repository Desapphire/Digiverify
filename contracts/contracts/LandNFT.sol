// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LandNFT
 * @notice ERC-721 token representing land ownership.
 *         Each property is minted as a unique NFT.
 *         Includes government-grade controls: freezing, unfreezing, and judicial overrides.
 */
contract LandNFT is ERC721, ERC721URIStorage, AccessControl, Pausable {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant COURT_ROLE  = keccak256("COURT_ROLE");

    // tokenId => frozen status
    mapping(uint256 => bool) public isFrozen;

    event LandMinted(address indexed to, uint256 indexed tokenId, string propertyCode);
    event PropertyFrozen(uint256 indexed tokenId, string reason);
    event PropertyUnfrozen(uint256 indexed tokenId);
    event ForceTransfer(uint256 indexed tokenId, address indexed from, address indexed to, string reason);

    constructor() ERC721("Government Land Registry NFT", "GLRNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(COURT_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @notice Mint a new land NFT.
     */
    function mintProperty(
        address to,
        uint256 tokenId,
        string calldata metadataURI
    ) external onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        emit LandMinted(to, tokenId, "");
    }

    /**
     * @notice Freeze a property due to dispute or legal order.
     */
    function freezeProperty(uint256 tokenId, string calldata reason) external onlyRole(COURT_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        isFrozen[tokenId] = true;
        emit PropertyFrozen(tokenId, reason);
    }

    /**
     * @notice Unfreeze a property.
     */
    function unfreezeProperty(uint256 tokenId) external onlyRole(COURT_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        isFrozen[tokenId] = false;
        emit PropertyUnfrozen(tokenId);
    }

    /**
     * @notice Force-transfer ownership bypassing usual approval (Court/Admin action).
     */
    function forceTransfer(
        address from,
        address to,
        uint256 tokenId,
        string calldata reason
    ) external onlyRole(COURT_ROLE) {
        _transfer(from, to, tokenId);
        emit ForceTransfer(tokenId, from, to, reason);
    }

    // ── Internal Hooks ─────────────────────────────────────

    /**
     * @dev Block transfers if property is frozen.
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        require(!isFrozen[tokenId], "Property is frozen and cannot be transferred");
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
