# ERC20 bridge

The bridge transfers any ERC20 token to a corresponding token on another chain.

## Inspired by
- https://github.com/paritytech/parity-bridge/

## Deploy
- Edit `deploy-config.json`.
- `npm run compile`
- `npm run deploy`

# Documentation

## Scenario
- Alice is a user of a Dapp and wants to use her mainnet (Home) ERC20 tokens on a private chain (Foreign).
- After using the tokens on the private chain she decides to transfer them back to the mainnet to trade them.

## Actors
- __Alice__: Account.
- __HomeBridge__: Bridge contract that is deployed on Home chain.
- __ForeignBridge__: Bridge contract that is deployed on Foreign chain.
- __Validator__: Program that is connected to both chain and acts as a middleman.
- __SampleERC20__: ERC20 contract that is deployed on both chains.

## Assumptions
- The authorized validator nodes act in __Alice__'s best intrest.
- The minimum threshold of validators is always online to process their request.
- Foreign __SampleERC20__ tokens can only be minted by the bridge.

### Setup
- Each __Validator__ node must have a seed corresponding to an account. These accounts need enough gas on both chains to send transactions on the private chain (ex. in case of mintnet this doesn't apply).
- __HomeBridge__ and __ForeignBridge__ must be deployed on their respective chains and suplied with the __Validator__ addresses and the threshold of signatures required for granting a request.
- The __SampleERC20__ must be deployed on both the home and foreign chain.
- __ForeignBridge__ should be given ownership of __SampleERC20__ on the foreign chain.
- Register the __SampleERC20__ token on __ForeignBridge__.
- Start all __Validator__ nodes.

### Main net (Home) to private net (Foreign)

- __Alice__ transfers 10 __SampleERC20__ tokens to __HomeBridge__ (which is a request to cross the bridge).
- __Validators__ pick up the *Transfer* event to __HomeBridge__ and signs that request.
- Every __Validator__ sends the signature to __ForeignBridge__.
- The bridge checks if that signature is valid and sends the *MintRequestSigned* event.
- When the signatures threshold is reached, the requested amount of tokens are minted to the address of the requester and the *MintRequestExecuted* event is sent.

### Private net (Foreign) to main net (Home)
- __Alice__ sends 10 __SampleERC20__ tokens to __ForeignBridge__.
- __Validators__ pick up the *Transfer* event to __HomeBridge__ and signs that request.
- Every __Validator__ sends the signature to __ForeignBridge__.
- The bridge checks if that signature is valid and sends the *WithdrawRequestSigned* event.
- When the signatures threshold is reached, the sent tokens are burned and the *WithdrawRequestGranted* event is sent.
- __Alice__ can now withdraw her funds (which costs gas) from the __HomeBridge__.
- __HomeBridge__ validates the withdrawal and transfers the __SampleERC20__ tokens to __Alice__.
