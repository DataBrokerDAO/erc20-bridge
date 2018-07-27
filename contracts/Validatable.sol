pragma solidity ^0.4.18;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract Validatable is Ownable {

	// Event created on validator gets added
	event ValidatorAdded (address validator);
	event ValidatorRemoved (address validator);
	uint8 public requiredValidators = 0;
	uint256 public validatorCount = 0;

	mapping (address=>bool) public validators;

	function Validatable(uint8 _requiredValidators,address[] _initialValidators) public {
		require(_requiredValidators != 0);
		require(_initialValidators.length >= _requiredValidators);
        	for (uint i = 0; i < _initialValidators.length; i++) {
	        	require(!isValidator(_initialValidators[i]) && _initialValidators[i] != address(0));
	        	addValidator(_initialValidators[i]);
	        }
        setRequiredValidators(_requiredValidators);
		validatorCount = _initialValidators.length;
	}

	function addValidator(address _validator)  public onlyOwner {
		assert(validators[_validator] != true);
		validators[_validator] = true;
		validatorCount++;
		emit ValidatorAdded(_validator);
	}

	function removeValidator(address _validator) public onlyOwner {
		require(validatorCount > requiredValidators);
		validators[_validator] = false;
		validatorCount--;
		emit ValidatorRemoved(_validator);
	}

	function setRequiredValidators(uint8 _requiredValidators) public onlyOwner {
		require(validatorCount >= _requiredValidators);
		requiredValidators = _requiredValidators;
	}

	function isValidator(address _validator) public view returns(bool) {
		return (validators[_validator] == true);
	}

	modifier onlyValidator(address _validator) {
		assert(validators[_validator] == true);
		_;
	}	
}
