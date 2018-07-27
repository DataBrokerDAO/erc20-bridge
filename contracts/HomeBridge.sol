pragma solidity ^0.4.18;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

import './Validatable.sol';

contract HomeBridge is Validatable {
	using SafeMath for uint256;

	mapping(bytes32=>bool) usedHashes;
	
	function HomeBridge(uint8 _requiredValidators,address[] _initialValidators) Validatable(_requiredValidators,_initialValidators) public {

	}

	function checkValidations(
		bytes32 _hash,
		uint256 _length,
		uint8[] _v,
		bytes32[] _r,
		bytes32[] _s) public view returns(uint8){
		uint8 approvals = 0;
        for (uint i = 0; i < _length ; i++) {
        	address validator = ecrecover(_hash, _v[i], _r[i], _s[i]);
        	assert(isValidator(validator));
        	approvals++;
        }
        return approvals;
	}

	function withdraw(
		address _token,
		address _recipient,
		uint256 _amount,
		uint256 _withdrawblock,
		uint8[] _v,
		bytes32[] _r,
		bytes32[] _s) public {

		bytes32 hash = sha256(_token,_recipient,_amount,_withdrawblock);

		// the hash should not have been used before
		assert(usedHashes[hash] == false);

		// mark hash as used
		usedHashes[hash] = true;

		assert(_token != 0x0);

		assert(_recipient != 0x0);

		assert(_amount >= 0);

		// the time-lock should have passed
		// assert(_withdrawblock <= block.number);		

		// verify the provided signatures
		assert(_v.length > 0);
		assert(_v.length == _r.length);
		assert(_v.length == _s.length);

		// verify if the threshold of required signatures is met
		assert(checkValidations(hash,_v.length,_v,_r,_s) >= requiredValidators);
		// ERC-20 transfer
		ERC20Basic(_token).transfer(_recipient, _amount);
	}	


}

