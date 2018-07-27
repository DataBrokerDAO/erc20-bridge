pragma solidity ^0.4.18;

import 'openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

contract SampleERC20 is BurnableToken, MintableToken {
  string public constant name = "Sample ERC20 token";
  string public constant symbol = "SAMPLE";
  uint8 public constant decimals = 18;
}

