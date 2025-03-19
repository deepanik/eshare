// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// ESHARE Token Contract
contract ESHAREToken is ERC20, Ownable {
    constructor() ERC20("eShare Token", "ESHARE") {
        // Mint 1 million tokens to the deployer
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

// File Storage Contract
contract FileStorage is Ownable, ReentrancyGuard {
    // Structs
    struct FileMetadata {
        string name;
        string ipfsHash;
        address owner;
        uint256 uploadTime;
        uint256 expiryTime;
        uint256 downloadLimit;
        uint256 downloadsRemaining;
        bool isActive;
    }

    struct StakingInfo {
        uint256 amount;
        uint256 stakingTime;
        uint256 lockPeriod;
        uint256 storageLimit;
        bool isActive;
    }

    // State variables
    ESHAREToken public stakingToken;
    mapping(address => FileMetadata[]) public userFiles;
    mapping(address => StakingInfo) public stakingInfo;
    mapping(address => uint256) public userStorageUsed;
    
    // Constants
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 tokens
    uint256 public constant MIN_STAKE_PERIOD = 7 days;
    uint256 public constant BASE_STORAGE_LIMIT = 100 * 1024 * 1024; // 100MB
    uint256 public constant STORAGE_MULTIPLIER = 1024 * 1024; // 1MB per 100 tokens staked

    // Events
    event FileUploaded(address indexed user, string name, string ipfsHash, uint256 fileId);
    event FileDeleted(address indexed user, uint256 fileId);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event StorageLimitUpdated(address indexed user, uint256 newLimit);

    constructor(address _stakingToken) {
        stakingToken = ESHAREToken(_stakingToken);
    }

    // File Management Functions
    function uploadFile(
        string memory _name,
        string memory _ipfsHash,
        uint256 _expiryTime,
        uint256 _downloadLimit
    ) external nonReentrant {
        require(_expiryTime > block.timestamp, "Expiry time must be in the future");
        require(_downloadLimit > 0, "Download limit must be greater than 0");
        
        uint256 fileSize = 0; // TODO: Get actual file size from IPFS
        require(
            userStorageUsed[msg.sender] + fileSize <= getStorageLimit(msg.sender),
            "Storage limit exceeded"
        );

        FileMetadata memory newFile = FileMetadata({
            name: _name,
            ipfsHash: _ipfsHash,
            owner: msg.sender,
            uploadTime: block.timestamp,
            expiryTime: _expiryTime,
            downloadLimit: _downloadLimit,
            downloadsRemaining: _downloadLimit,
            isActive: true
        });

        userFiles[msg.sender].push(newFile);
        userStorageUsed[msg.sender] += fileSize;

        emit FileUploaded(msg.sender, _name, _ipfsHash, userFiles[msg.sender].length - 1);
    }

    function deleteFile(uint256 _fileId) external nonReentrant {
        require(_fileId < userFiles[msg.sender].length, "File does not exist");
        require(userFiles[msg.sender][_fileId].owner == msg.sender, "Not file owner");
        
        userFiles[msg.sender][_fileId].isActive = false;
        emit FileDeleted(msg.sender, _fileId);
    }

    // Staking Functions
    function stake(uint256 _amount, uint256 _lockPeriod) external nonReentrant {
        require(_amount >= MIN_STAKE_AMOUNT, "Stake amount too low");
        require(_lockPeriod >= MIN_STAKE_PERIOD, "Lock period too short");
        require(stakingToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        StakingInfo storage info = stakingInfo[msg.sender];
        info.amount = _amount;
        info.stakingTime = block.timestamp;
        info.lockPeriod = _lockPeriod;
        info.isActive = true;
        info.storageLimit = BASE_STORAGE_LIMIT + (_amount * STORAGE_MULTIPLIER / MIN_STAKE_AMOUNT);

        emit Staked(msg.sender, _amount);
        emit StorageLimitUpdated(msg.sender, info.storageLimit);
    }

    function unstake() external nonReentrant {
        StakingInfo storage info = stakingInfo[msg.sender];
        require(info.isActive, "No active stake");
        require(
            block.timestamp >= info.stakingTime + info.lockPeriod,
            "Lock period not ended"
        );

        uint256 amount = info.amount;
        info.amount = 0;
        info.isActive = false;
        info.storageLimit = BASE_STORAGE_LIMIT;

        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");

        emit Unstaked(msg.sender, amount);
        emit StorageLimitUpdated(msg.sender, BASE_STORAGE_LIMIT);
    }

    // View Functions
    function getFileMetadata(address _user, uint256 _fileId) external view returns (FileMetadata memory) {
        require(_fileId < userFiles[_user].length, "File does not exist");
        return userFiles[_user][_fileId];
    }

    function getUserFiles(address _user) external view returns (FileMetadata[] memory) {
        return userFiles[_user];
    }

    function getStakingInfo(address _user) external view returns (StakingInfo memory) {
        return stakingInfo[_user];
    }

    function getStorageLimit(address _user) public view returns (uint256) {
        return stakingInfo[_user].isActive ? stakingInfo[_user].storageLimit : BASE_STORAGE_LIMIT;
    }

    function getStorageUsed(address _user) external view returns (uint256) {
        return userStorageUsed[_user];
    }
} 