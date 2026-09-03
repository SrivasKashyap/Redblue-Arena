// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title CredentialNFT
/// @notice One token per (match, candidate) minted by RedBlue Arena's
///         service wallet at match completion. Full metadata (role,
///         score, OWASP categories demonstrated, match timestamp) is
///         stored off-chain and referenced by tokenURI to keep on-chain
///         data minimal for gas efficiency.
contract CredentialNFT is ERC721, Ownable {
    uint256 private _nextTokenId;

    mapping(uint256 => string) private _tokenURIs;

    event CredentialMinted(uint256 indexed tokenId, address indexed to, string metadataURI);

    constructor(address initialOwner)
        ERC721("RedBlue Arena Credential", "RBAC")
        Ownable(initialOwner)
    {}

    /// @notice Mint a credential. Callable only by the service wallet
    ///         (contract owner). `to` may be the service wallet's own
    ///         custody address for candidates without a personal wallet —
    ///         see Section 7 of the build prompt for the claim/transfer
    ///         pattern if you extend this later.
    function mintCredential(address to, string calldata metadataURI)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = metadataURI;
        emit CredentialMinted(tokenId, to, metadataURI);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }
}
