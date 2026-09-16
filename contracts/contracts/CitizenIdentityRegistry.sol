// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CitizenIdentityRegistry
 * @notice Zero-Knowledge & Cryptographic KYC Identity Attestation Registry for DigiVerify.
 * Stores verified identity commitment hashes (Aadhaar / PAN verification stamps & biometric validity)
 * without storing raw private citizen PII on-chain.
 */
contract CitizenIdentityRegistry is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant AUTHORITY_ROLE = keccak256("AUTHORITY_ROLE");

    enum KycLevel {
        UNVERIFIED,      // 0: Not verified
        BASIC_ID,        // 1: Government ID Document verified (Aadhaar/PAN hash match)
        BIOMETRIC_PASS,  // 2: Biometric live face match verified
        FULL_ATTESTED    // 3: Officer signed & verified GovTech KYC
    }

    struct IdentityAttestation {
        address citizenWallet;
        bytes32 identityCommitmentHash; // SHA-256 (ID Number + Salt)
        bytes32 biometricFaceMatchHash; // Hash of face embedding / live liveness session
        KycLevel kycLevel;
        address verifiedByOfficer;
        uint256 attestedAt;
        uint256 expiresAt;
        bool isValid;
        string remarks;
    }

    mapping(address => IdentityAttestation) public attestations;
    mapping(bytes32 => address) public commitmentToWallet;
    uint256 public totalAttestedCitizens;

    event IdentityAttested(
        address indexed citizenWallet,
        bytes32 indexed identityCommitmentHash,
        KycLevel kycLevel,
        address indexed verifiedByOfficer,
        uint256 expiresAt
    );

    event BiometricUpdated(
        address indexed citizenWallet,
        bytes32 newFaceMatchHash,
        uint256 updatedAt
    );

    event IdentityRevoked(
        address indexed citizenWallet,
        string reason,
        uint256 revokedAt
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(AUTHORITY_ROLE, msg.sender);
    }

    /**
     * @notice GovTech officer or verifier attests a citizen's identity on-chain.
     */
    function attestCitizenIdentity(
        address _citizenWallet,
        bytes32 _identityCommitmentHash,
        bytes32 _biometricFaceMatchHash,
        KycLevel _kycLevel,
        uint256 _validityDurationSeconds,
        string calldata _remarks
    ) external onlyRole(VERIFIER_ROLE) {
        require(_citizenWallet != address(0), "Invalid citizen wallet");
        require(_identityCommitmentHash != bytes32(0), "Identity hash required");
        require(_kycLevel != KycLevel.UNVERIFIED, "Invalid KYC level");

        address existingOwner = commitmentToWallet[_identityCommitmentHash];
        require(existingOwner == address(0) || existingOwner == _citizenWallet, "Identity already registered to another wallet");

        if (!attestations[_citizenWallet].isValid) {
            totalAttestedCitizens++;
        }

        uint256 expiresAt = block.timestamp + _validityDurationSeconds;

        attestations[_citizenWallet] = IdentityAttestation({
            citizenWallet: _citizenWallet,
            identityCommitmentHash: _identityCommitmentHash,
            biometricFaceMatchHash: _biometricFaceMatchHash,
            kycLevel: _kycLevel,
            verifiedByOfficer: msg.sender,
            attestedAt: block.timestamp,
            expiresAt: expiresAt,
            isValid: true,
            remarks: _remarks
        });

        commitmentToWallet[_identityCommitmentHash] = _citizenWallet;

        emit IdentityAttested(
            _citizenWallet,
            _identityCommitmentHash,
            _kycLevel,
            msg.sender,
            expiresAt
        );
    }

    /**
     * @notice Update biometric face match session hash.
     */
    function updateBiometricVerification(
        address _citizenWallet,
        bytes32 _newFaceMatchHash
    ) external onlyRole(VERIFIER_ROLE) {
        IdentityAttestation storage att = attestations[_citizenWallet];
        require(att.isValid, "Citizen is not attested");

        att.biometricFaceMatchHash = _newFaceMatchHash;
        if (att.kycLevel < KycLevel.BIOMETRIC_PASS) {
            att.kycLevel = KycLevel.BIOMETRIC_PASS;
        }

        emit BiometricUpdated(_citizenWallet, _newFaceMatchHash, block.timestamp);
    }

    /**
     * @notice Revoke or suspend a citizen's KYC attestation (fraud, identity theft, or expired).
     */
    function revokeCitizenIdentity(
        address _citizenWallet,
        string calldata _reason
    ) external onlyRole(AUTHORITY_ROLE) {
        IdentityAttestation storage att = attestations[_citizenWallet];
        require(att.isValid, "Attestation not active");

        att.isValid = false;
        att.remarks = _reason;
        if (totalAttestedCitizens > 0) {
            totalAttestedCitizens--;
        }

        emit IdentityRevoked(_citizenWallet, _reason, block.timestamp);
    }

    /**
     * @notice Check if a citizen has a valid and unexpired KYC attestation.
     */
    function isCitizenAttested(address _citizenWallet) external view returns (bool, KycLevel) {
        IdentityAttestation memory att = attestations[_citizenWallet];
        if (att.isValid && att.expiresAt >= block.timestamp) {
            return (true, att.kycLevel);
        }
        return (false, KycLevel.UNVERIFIED);
    }

    /**
     * @notice Retrieve full identity attestation record for a citizen wallet.
     */
    function getAttestation(address _citizenWallet) external view returns (IdentityAttestation memory) {
        require(attestations[_citizenWallet].citizenWallet != address(0), "No attestation found");
        return attestations[_citizenWallet];
    }
}
