/**
 * NFT Metadata & Digital Land Title Certificate Service.
 * Generates official high-resolution SVG title certificates and pins ERC-721 metadata to IPFS via Pinata.
 */

const axios = require('axios');
const FormData = require('form-data');

/**
 * Generates an SVG certificate for the Land Title Deed.
 */
const generateCertificateSVG = (property) => {
    const code = property.propertyCode || 'UNKNOWN';
    const survey = property.surveyNumber || 'N/A';
    const area = property.areaSqft ? `${property.areaSqft} Sq. Ft` : 'N/A';
    const district = property.district || 'Registry District';
    const state = property.state || 'Registry State';
    const owner = property.ownerWallet || property.ownerAddress || '0x0000000000000000000000000000000000000000';
    const shortOwner = `${owner.slice(0, 10)}...${owner.slice(-8)}`;
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#050811" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1000" height="700" fill="url(#bgGrad)" />
  <rect width="1000" height="700" fill="url(#grid)" />

  <!-- Outer Certificate Border -->
  <rect x="25" y="25" width="950" height="650" rx="20" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-dasharray="6,4" />
  <rect x="35" y="35" width="930" height="630" rx="16" fill="rgba(15, 23, 42, 0.6)" stroke="rgba(255, 215, 0, 0.2)" stroke-width="1.5" />

  <!-- Corner Ornaments -->
  <path d="M 45 75 L 75 45 M 45 45 L 90 45 M 45 45 L 45 90" stroke="url(#goldGrad)" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 955 75 L 925 45 M 955 45 L 910 45 M 955 45 L 955 90" stroke="url(#goldGrad)" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 45 625 L 75 655 M 45 655 L 90 655 M 45 655 L 45 610" stroke="url(#goldGrad)" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 955 625 L 925 655 M 955 655 L 910 655 M 955 655 L 955 610" stroke="url(#goldGrad)" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Header / Crest -->
  <g transform="translate(500, 100)" text-anchor="middle">
    <!-- Emblem Circle -->
    <circle cx="0" cy="-20" r="32" fill="#1e293b" stroke="url(#goldGrad)" stroke-width="2"/>
    <text x="0" y="-12" font-size="24" fill="#fbbf24" font-family="Arial, sans-serif" font-weight="bold">🏛️</text>
    
    <text x="0" y="30" font-size="14" font-family="Segoe UI, Helvetica, sans-serif" font-weight="bold" fill="#06b6d4" letter-spacing="4">GOVERNMENT OF INDIA • REVENUE DEPARTMENT</text>
    <text x="0" y="65" font-size="30" font-family="Georgia, serif" font-weight="bold" fill="url(#goldGrad)" letter-spacing="2">DIGITAL LAND TITLE DEED</text>
    <text x="0" y="90" font-size="13" font-family="Segoe UI, sans-serif" fill="#94a3b8" letter-spacing="1">SOVEREIGN ON-CHAIN DEED CERTIFICATE • ETHEREUM SEPOLIA</text>
  </g>

  <!-- Divider -->
  <line x1="120" y1="210" x2="880" y2="210" stroke="rgba(251, 191, 36, 0.4)" stroke-width="1.5" />

  <!-- Property Details Grid -->
  <g transform="translate(100, 245)" font-family="Segoe UI, Helvetica, sans-serif">
    
    <!-- Left Column: Property Identity -->
    <g transform="translate(0, 0)">
      <rect width="380" height="68" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="20" y="26" font-size="11" fill="#94a3b8" font-weight="bold" letter-spacing="1">PROPERTY IDENTIFIER CODE</text>
      <text x="20" y="52" font-size="20" fill="#38bdf8" font-weight="bold" font-family="Courier, monospace">${code}</text>
    </g>

    <g transform="translate(0, 85)">
      <rect width="380" height="68" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="20" y="26" font-size="11" fill="#94a3b8" font-weight="bold" letter-spacing="1">REVENUE SURVEY / HISSA NO.</text>
      <text x="20" y="52" font-size="18" fill="#f8fafc" font-weight="bold">${survey}</text>
    </g>

    <g transform="translate(0, 170)">
      <rect width="380" height="68" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="20" y="26" font-size="11" fill="#94a3b8" font-weight="bold" letter-spacing="1">REGISTERED PLOT AREA</text>
      <text x="20" y="52" font-size="18" fill="#4ade80" font-weight="bold">${area}</text>
    </g>

    <g transform="translate(0, 255)">
      <rect width="380" height="68" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="20" y="26" font-size="11" fill="#94a3b8" font-weight="bold" letter-spacing="1">JURISDICTION / DISTRICT &amp; STATE</text>
      <text x="20" y="52" font-size="17" fill="#f8fafc" font-weight="600">${district}, ${state}</text>
    </g>

    <!-- Right Column: Blockchain Title & Verification -->
    <g transform="translate(420, 0)">
      <rect width="380" height="68" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="20" y="26" font-size="11" fill="#94a3b8" font-weight="bold" letter-spacing="1">LEGAL TITLE STATUS</text>
      <text x="20" y="52" font-size="18" fill="#22c55e" font-weight="bold">✔ VERIFIED CLEAR TITLE</text>
    </g>

    <g transform="translate(420, 85)">
      <rect width="380" height="68" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="20" y="26" font-size="11" fill="#94a3b8" font-weight="bold" letter-spacing="1">REGISTERED PRIMARY OWNER</text>
      <text x="20" y="52" font-size="14" fill="#cbd5e1" font-weight="bold" font-family="Courier, monospace">${shortOwner}</text>
    </g>

    <g transform="translate(420, 170)">
      <rect width="380" height="68" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="20" y="26" font-size="11" fill="#94a3b8" font-weight="bold" letter-spacing="1">ENCUMBRANCE / LIEN STATUS</text>
      <text x="20" y="52" font-size="16" fill="${property.isEncumbered ? '#ef4444' : '#10b981'}" font-weight="bold">
        ${property.isEncumbered ? '⚠ ENCUMBERED' : '🛡 UNENCUMBERED (CLEAR)'}
      </text>
    </g>

    <g transform="translate(420, 255)">
      <rect width="380" height="68" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="20" y="26" font-size="11" fill="#94a3b8" font-weight="bold" letter-spacing="1">APPROVAL DATE &amp; NETWORK</text>
      <text x="20" y="52" font-size="16" fill="#f8fafc" font-weight="600">${date} • Ethereum Sepolia (11155111)</text>
    </g>
  </g>

  <!-- Footer Seal & Cryptographic Security Stamp -->
  <g transform="translate(500, 605)" text-anchor="middle" font-family="Segoe UI, sans-serif">
    <text x="0" y="0" font-size="11" fill="#64748b" letter-spacing="2">IMMUTABLE DEED • SECURED BY DIGIVERIFY PROTOCOL • ERC-721 SOVEREIGN TOKEN</text>
    <text x="0" y="20" font-size="10" fill="#475569">Certified authentic by Department of Revenue &amp; Land Administration Registry</text>
  </g>
</svg>`;
};

/**
 * Upload an SVG file buffer to Pinata IPFS.
 */
const uploadSVGToPinata = async (svgString, filename = 'land_certificate.svg') => {
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

    if (!pinataApiKey || !pinataSecretApiKey) {
        console.warn('Pinata API keys missing, using inline SVG Data URI');
        const base64 = Buffer.from(svgString).toString('base64');
        return `data:image/svg+xml;base64,${base64}`;
    }

    try {
        const formData = new FormData();
        const buffer = Buffer.from(svgString, 'utf-8');
        formData.append('file', buffer, {
            filename: filename,
            contentType: 'image/svg+xml',
        });

        const pinataMetadata = JSON.stringify({
            name: filename,
            keyvalues: {
                type: 'land_certificate_svg',
            },
        });
        formData.append('pinataMetadata', pinataMetadata);

        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            headers: {
                ...formData.getHeaders(),
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey,
            },
            maxBodyLength: Infinity,
        });

        return `ipfs://${response.data.IpfsHash}`;
    } catch (err) {
        console.error('Failed to pin SVG to Pinata:', err.response?.data || err.message);
        const base64 = Buffer.from(svgString).toString('base64');
        return `data:image/svg+xml;base64,${base64}`;
    }
};

/**
 * Pins ERC-721 JSON metadata to Pinata IPFS.
 */
const pinJSONToPinata = async (metadataObj, name = 'LandNFT_Metadata') => {
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

    if (!pinataApiKey || !pinataSecretApiKey) {
        console.warn('Pinata API keys missing, returning Data URI for metadata');
        const base64 = Buffer.from(JSON.stringify(metadataObj)).toString('base64');
        return `data:application/json;base64,${base64}`;
    }

    try {
        const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            pinataContent: metadataObj,
            pinataMetadata: {
                name: name,
            },
        }, {
            headers: {
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey,
            },
        });

        return `ipfs://${response.data.IpfsHash}`;
    } catch (err) {
        console.error('Failed to pin JSON to Pinata:', err.response?.data || err.message);
        const base64 = Buffer.from(JSON.stringify(metadataObj)).toString('base64');
        return `data:application/json;base64,${base64}`;
    }
};

/**
 * Builds complete standard ERC-721 metadata and pins it to IPFS.
 * Returns the IPFS URI `ipfs://<CID>` (or fallback Data URI).
 */
const generateAndPinNFTMetadata = async (property) => {
    try {
        const pCode = property.propertyCode || 'UNKNOWN';
        console.log(`Generating Land Deed Digital Certificate for ${pCode}...`);

        // 1. Generate & Pin SVG Certificate Image
        const svgString = generateCertificateSVG(property);
        const imageURI = await uploadSVGToPinata(svgString, `Certificate_${pCode}.svg`);
        console.log(`Certificate image pinned: ${imageURI}`);

        // 2. Build ERC-721 Standard Metadata
        const metadata = {
            name: `DigiVerify Land Title — ${pCode}`,
            description: `Official Sovereign Land Title Deed & Ownership Certificate for Property ${pCode}, Survey #${property.surveyNumber || 'N/A'} located in ${property.district || ''}, ${property.state || ''}. Digitally authenticated by the Revenue Authority and permanently anchored on Ethereum Sepolia Testnet.`,
            image: imageURI,
            external_url: `https://sepolia.etherscan.io/token/0xbCB28DC4eF6242572c0a65D1643595C582106249`,
            attributes: [
                { trait_type: 'Property Code', value: pCode },
                { trait_type: 'Survey Number', value: property.surveyNumber || 'N/A' },
                { trait_type: 'Survey Details', value: property.surveyDetails || 'Revenue Subdivision' },
                { trait_type: 'Area (Sq. Ft)', value: parseFloat(property.areaSqft) || 0 },
                { trait_type: 'District', value: property.district || 'N/A' },
                { trait_type: 'State', value: property.state || 'N/A' },
                { trait_type: 'Coordinates', value: (property.geoLat && property.geoLng ? `${property.geoLat}, ${property.geoLng}` : property.coordinates) || 'N/A' },
                { trait_type: 'First Owner', value: property.ownerWallet || property.ownerAddress || 'N/A' },
                { trait_type: 'Title Status', value: 'Government Verified & Clear Title' },
                { trait_type: 'Encumbrance Status', value: property.isEncumbered ? 'Encumbered' : 'Clear Title' },
                { trait_type: 'Valuation (INR)', value: property.estimatedFairPrice ? `₹${Number(property.estimatedFairPrice).toLocaleString('en-IN')}` : 'N/A' },
                { trait_type: 'Issuing Authority', value: 'Revenue Department Land Administration' },
                { trait_type: 'Blockchain Network', value: 'Ethereum Sepolia Testnet (11155111)' }
            ]
        };

        // 3. Pin Metadata JSON to IPFS
        const metadataURI = await pinJSONToPinata(metadata, `Metadata_${pCode}`);
        console.log(`Metadata pinned successfully to IPFS: ${metadataURI}`);

        return metadataURI;
    } catch (err) {
        console.error('Error generating and pinning NFT metadata:', err);
        // Safe fallback
        const base64 = Buffer.from(JSON.stringify({
            name: `DigiVerify Land Deed #${property.propertyCode}`,
            description: `Land Title for ${property.propertyCode}`,
            attributes: [{ trait_type: 'Property Code', value: property.propertyCode }]
        })).toString('base64');
        return `data:application/json;base64,${base64}`;
    }
};

module.exports = {
    generateCertificateSVG,
    generateAndPinNFTMetadata,
    uploadSVGToPinata,
    pinJSONToPinata
};
