// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface ILandNFT {
    function mintLand(address to, string calldata propertyCode, string calldata metadataURI) external returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function getTokenByPropertyCode(string calldata propertyCode) external view returns (uint256);
}

/**
 * @title LandRegistry
 * @notice On-chain property registry. Registers properties by minting NFTs
 *         and stores document hashes for verification.
 */
contract LandRegistry is AccessControl {

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    ILandNFT public landNFT;

    struct Property {
        address owner;
        uint256 tokenId;
        string  documentHash;
        bool    exists;
    }

    // propertyCode → Property
    mapping(string => Property) public properties;

    event PropertyRegistered(
        string  propertyCode,
        address indexed owner,
        uint256 indexed tokenId
    );

    event DocumentHashUpdated(
        string  propertyCode,
        string  oldHash,
        string  newHash
    );

    constructor(address _landNFT) {
        require(_landNFT != address(0), "Invalid NFT address");
        landNFT = ILandNFT(_landNFT);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    /**
     * @notice Register a new property — mints an NFT and stores the document hash.
     * @param propertyCode Unique property identifier.
     * @param owner        Wallet address of the property owner.
     * @param documentHash IPFS hash of the property documents.
     */
    function registerProperty(
        string calldata propertyCode,
        address owner,
        string calldata documentHash
    ) external onlyRole(REGISTRAR_ROLE) {
        require(!properties[propertyCode].exists, "Property already registered");
        require(owner != address(0), "Invalid owner address");

        // Mint NFT (uses empty string for metadata URI — can be set later)
        uint256 tokenId = landNFT.mintLand(owner, propertyCode, "");

        properties[propertyCode] = Property({
            owner: owner,
            tokenId: tokenId,
            documentHash: documentHash,
            exists: true
        });

        emit PropertyRegistered(propertyCode, owner, tokenId);
    }

    /**
     * @notice Update the document hash for a property.
     */
    function updateDocumentHash(
        string calldata propertyCode,
        string calldata newHash
    ) external onlyRole(REGISTRAR_ROLE) {
        require(properties[propertyCode].exists, "Property not registered");

        string memory oldHash = properties[propertyCode].documentHash;
        properties[propertyCode].documentHash = newHash;

        emit DocumentHashUpdated(propertyCode, oldHash, newHash);
    }

    /**
     * @notice Get property details.
     */
    function getProperty(string calldata propertyCode)
        external view returns (address owner, uint256 tokenId, string memory documentHash)
    {
        require(properties[propertyCode].exists, "Property not registered");
        Property storage p = properties[propertyCode];
        return (p.owner, p.tokenId, p.documentHash);
    }

    /**
     * @notice Verify the current on-chain owner of a property.
     */
    function verifyOwner(string calldata propertyCode)
        external view returns (address)
    {
        require(properties[propertyCode].exists, "Property not registered");
        return landNFT.ownerOf(properties[propertyCode].tokenId);
    }
}
