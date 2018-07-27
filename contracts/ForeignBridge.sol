pragma solidity ^0.4.18;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import './Validatable.sol';

contract ForeignBridge is Ownable, Validatable {

	mapping(bytes32=>uint8) public requests;
	mapping(bytes32=>bool) public requestsDone;
	mapping(bytes32=>bool) public signedRequests;

	mapping(address=>bool) public validators;

	// maps home token addresses -> foreign token addresses
	mapping(address=>address) public tokenMap;
    address[] public registeredTokens;

	event TokenAdded(address _mainToken,address _sideToken);
	event MintRequestSigned(bytes32 _mintRequestsHash, bytes32 indexed _transactionHash,address _mainToken, address _recipient,uint256 _amount,uint8 _requiredSignatures,uint8 _signatureCount,bytes32 _signRequestHash);
	event MintRequestExecuted(bytes32 _mintRequestsHash, bytes32 indexed _transactionHash,address _mainToken, address _recipient,uint256 _amount);

	event WithdrawRequest(address _to,uint256 _amount,bytes32 _withdrawhash);
	event WithdrawRequestSigned(bytes32 _withdrawRequestsHash, bytes32 _transactionHash,address _mainToken, address _recipient,uint256 _amount,uint256 _withdrawBlock,address _signer, uint8 _v, bytes32 _r, bytes32 _s);
	event WithdrawRequestGranted(bytes32 _withdrawRequestsHash, bytes32 _transactionHash,address _mainToken, address _recipient,uint256 _amount,uint256 _withdrawBlock);

	function ForeignBridge(uint8 _requiredValidators,address[] _initialValidators) Validatable(_requiredValidators,_initialValidators) public {
	}

	// Register ERC20 token on the home net and its counterpart token on the foreign net.
	function registerToken(address _mainToken, address _foreignToken) public onlyOwner {
		assert(tokenMap[_mainToken] == 0);

		assert(_mainToken != 0x0);
		assert(_foreignToken != 0x0);

		Ownable t = Ownable(_foreignToken);

		assert(address(t) != 0x0);
		assert(t.owner() == address(this));

		tokenMap[_mainToken] = t;
		registeredTokens.push(_mainToken);
		emit TokenAdded(_mainToken, _foreignToken);
	}

	function tokens() public view returns(address[]) {
			return registeredTokens;
	}

	function signMintRequest(bytes32 _transactionHash,address _mainToken, address _recipient,uint256 _amount,uint8 _v, bytes32 _r, bytes32 _s) public {
		assert(_amount > 0);

		// Token should be registered
		assert(tokenMap[_mainToken] != 0x0);

		// Unique hash for this request
		bytes32 reqHash = sha256(_transactionHash,_mainToken,_recipient,_amount);

		// Request shouldnt be done
		assert(requestsDone[reqHash] != true);

		address validator = ecrecover(reqHash, _v, _r, _s);
		assert(isValidator(validator));

		// Request shouldnt already be signed by validator
		bytes32 signRequestHash = sha256(reqHash,validator);
		assert(signedRequests[signRequestHash] != true);
		signedRequests[signRequestHash] = true;
		
		requests[reqHash]++;
		if (requests[reqHash] < requiredValidators) {
			emit MintRequestSigned(reqHash, _transactionHash, _mainToken,  _recipient, _amount, requiredValidators, requests[reqHash], signRequestHash);
		} else {
			requestsDone[reqHash] = true;
			MintableToken(tokenMap[_mainToken]).mint(_recipient,_amount);
			emit MintRequestExecuted(reqHash,_transactionHash, tokenMap[_mainToken],  _recipient, _amount);
		}
	}

	function signWithdrawRequest(bytes32 _transactionHash,address _mainToken, address _recipient,uint256 _amount,uint256 _withdrawBlock,uint8 _v, bytes32 _r, bytes32 _s) public {
		assert(_amount > 0);

		// Token should be registered
		assert(tokenMap[_mainToken] != 0x0);

		// Unique hash for this request
		bytes32 reqHash = sha256(_mainToken,_recipient,_amount,_withdrawBlock);

		// Request shouldnt be done
		assert(requestsDone[reqHash] != true);

		address validator = ecrecover(reqHash, _v, _r, _s);
		assert(isValidator(validator));		

		// Request shouldnt already be signed by validator
		bytes32 signRequestHash = sha256(reqHash,validator);
		assert(signedRequests[signRequestHash] != true);
		signedRequests[signRequestHash] = true;

		requests[reqHash]++;

		emit WithdrawRequestSigned(reqHash, _transactionHash, _mainToken,  _recipient, _amount, _withdrawBlock, validator, _v, _r, _s);

		if (requests[reqHash] >= requiredValidators) {
			requestsDone[reqHash] = true;

			// Burn the tokens we received
			BurnableToken(tokenMap[_mainToken]).burn(_amount);

			emit WithdrawRequestGranted(reqHash, _transactionHash, _mainToken, _recipient, _amount, _withdrawBlock);
		}
	}



}

