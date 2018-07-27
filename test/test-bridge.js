const SampleERC20 = artifacts.require("./SampleERC20.sol");
const HomeERC20Bridge = artifacts.require("./HomeERC20Bridge");
const ForeignERC777Bridge = artifacts.require("./ForeignERC777Bridge.sol");
const erc777 = artifacts.require("erc777/contracts/examples/ReferenceToken.sol");

const keythereum = require('keythereum');
const ethUtil = require('ethereumjs-util');
const EthereumTx = require('ethereumjs-tx')
const utility = require('../bridgelib.js')();
const sha256 = require('js-sha256').sha256;
const EIP820 = require('eip820');

contract('SampleERC20/ERC777', (accounts) => {
	// HOMECHAIN
	// the ERC20 token on the home chain
	let homeToken;
	let homeTokenOwner = accounts[1];

	let bridgeOwner = accounts[2];

	// the HomeERC20Bridge contract
	let homeERC20Bridge;
	const requiredValidators = 3;

	// Alice : the sender
	let alicePublic; // = accounts[3];
	let alicePrivate; // = accounts[3];
	let aliceAmount = 1e18;
	let aliceReward = 1; // amount of tokens offered as reward for withdrawal

	// SIDECHAIN
	// the ForeignERC777Bridge contract
	let foreignERC777Bridge;

	let sidechainToken;

	// validator set
	let validators = [];

	// inverse test
	let nonValidators = [];

	gasStats = [];

	function mkkeypair() {
		var dk = keythereum.create();
		var keyObject = keythereum.dump("none", dk.privateKey, dk.salt, dk.iv);
		return ({
			private: dk.privateKey.toString('hex'),
			public: ethUtil.addHexPrefix(keyObject.address)
		});
	}

	function collectGasStats(transactionHash, group, description, cb) {
		web3.eth.getTransactionReceipt(transactionHash, function(e, tx) {
			gasStats.push({
				group: group,
				name: description,
				gasUsed: tx.gasUsed
			})
			if (cb) cb();
		});
	}

	describe('HomeChain setup', () => {
		it('generate 10 validator keys', async () => {
			for (let i = 0; i < 10; i++) {
				validators.push(mkkeypair());
			}
			alicePublic = validators[9].public;
			alicePrivate = validators[9].private;
		});

		it('send some gas to Alice ', async () => {
			await web3.eth.sendTransaction({
				from: accounts[0],
				to: alicePublic,
				value: 1e17
			});
		});

		it('checks balance of Alice ', async () => {
			await assert.ok(web3.eth.getBalance(alicePublic).toNumber());
		});

		it("deploys SampleERC20coin", async () => {
			await SampleERC20.new({
				from: homeTokenOwner
			}).then(function(_instance) {
				assert.ok(_instance.address);
				homeToken = _instance;
				collectGasStats(_instance.transactionHash, 'setup', 'deploys SampleERC20coin');
			});
		});

		it("mints SampleERC20coin to alice", async () => {
			await homeToken.mint(alicePublic, aliceAmount, {
				from: homeTokenOwner
			});
		});

		it("deploys HomeERC20Bridge", async () => {
			let validatorpubkeys = validators.reduce((accumulator, currentValue) => {
				accumulator.push(currentValue.public);
				return accumulator;
			}, []);
			await HomeERC20Bridge.new(3, validatorpubkeys, {
				from: bridgeOwner
			}).then(function(_instance) {
				assert.ok(_instance.address);
				homeERC20Bridge = _instance;
			});
		});
	});

	describe('ForeignChain setup', () => {

		it("deploys the EIP820 registry", async () => {
			await web3.eth.sendTransaction({
				from: bridgeOwner,
				to: "0x91c2b265ece9442ed28e3c4283652b1894dcdabb",
				value: 1e17
			});
			// see deploy notes : https://github.com/ethereum/EIPs/issues/820
			await web3.eth.sendRawTransaction('0xf908778085174876e800830c35008080b908246060604052341561000f57600080fd5b6108068061001e6000396000f30060606040526004361061008d5763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166329965a1d81146100925780633d584063146100bd578063571a1f66146100f85780635df8122f1461012457806365ba36c11461014957806390e47957146101ac578063aabbb8ca146101ec578063ddc23ddd1461020e575b600080fd5b341561009d57600080fd5b6100bb600160a060020a03600435811690602435906044351661023a565b005b34156100c857600080fd5b6100dc600160a060020a03600435166103ec565b604051600160a060020a03909116815260200160405180910390f35b341561010357600080fd5b6100bb600160a060020a0360043516600160e060020a031960243516610438565b341561012f57600080fd5b6100bb600160a060020a03600435811690602435166104c2565b341561015457600080fd5b61019a60046024813581810190830135806020601f8201819004810201604051908101604052818152929190602084018383808284375094965061057d95505050505050565b60405190815260200160405180910390f35b34156101b757600080fd5b6101d8600160a060020a0360043516600160e060020a0319602435166105e2565b604051901515815260200160405180910390f35b34156101f757600080fd5b6100dc600160a060020a0360043516602435610658565b341561021957600080fd5b6101d8600160a060020a0360043516600160e060020a0319602435166106b7565b8233600160a060020a031661024e826103ec565b600160a060020a03161461026157600080fd5b61026a8361076e565b1561027457600080fd5b600160a060020a0382161580159061029e575033600160a060020a031682600160a060020a031614155b15610373576040517f4552433832305f4143434550545f4d41474943000000000000000000000000008152601301604051908190039020600160a060020a03831663f008325086866000604051602001526040517c010000000000000000000000000000000000000000000000000000000063ffffffff8516028152600160a060020a0390921660048301526024820152604401602060405180830381600087803b151561034b57600080fd5b6102c65a03f1151561035c57600080fd5b505050604051805191909114905061037357600080fd5b600160a060020a0384811660008181526020818152604080832088845290915290819020805473ffffffffffffffffffffffffffffffffffffffff191693861693841790558591907f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a41313bd352db153905160405180910390a450505050565b600160a060020a038082166000908152600160205260408120549091161515610416575080610433565b50600160a060020a03808216600090815260016020526040902054165b919050565b61044282826106b7565b61044d57600061044f565b815b600160a060020a03928316600081815260208181526040808320600160e060020a031996909616808452958252808320805473ffffffffffffffffffffffffffffffffffffffff19169590971694909417909555908152600284528181209281529190925220805460ff19166001179055565b8133600160a060020a03166104d6826103ec565b600160a060020a0316146104e957600080fd5b82600160a060020a031682600160a060020a031614610508578161050b565b60005b600160a060020a0384811660008181526001602052604090819020805473ffffffffffffffffffffffffffffffffffffffff191694841694909417909355908416917f605c2dbf762e5f7d60a546d42e7205dcb1b011ebc62a61736a57c9089d3a4350905160405180910390a3505050565b6000816040518082805190602001908083835b602083106105af5780518252601f199092019160209182019101610590565b6001836020036101000a038019825116818451161790925250505091909101925060409150505180910390209050919050565b600160a060020a0382166000908152600260209081526040808320600160e060020a03198516845290915281205460ff161515610623576106238383610438565b50600160a060020a03918216600090815260208181526040808320600160e060020a0319949094168352929052205416151590565b6000806106648361076e565b1561068957508161067584826105e2565b610680576000610682565b835b91506106b0565b600160a060020a038085166000908152602081815260408083208784529091529020541691505b5092915050565b600080806106e5857f01ffc9a700000000000000000000000000000000000000000000000000000000610790565b90925090508115806106f5575080155b156107035760009250610766565b61071585600160e060020a0319610790565b909250905081158061072657508015155b156107345760009250610766565b61073e8585610790565b90925090506001821480156107535750806001145b156107615760019250610766565b600092505b505092915050565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff161590565b6000807f01ffc9a70000000000000000000000000000000000000000000000000000000060405181815284600482015260208160088389617530fa935080519250505092509290505600a165627a7a72305820b424185958879a1eef1cb7235bfd8ed607a7402b46853860e5343340925f028e00291ba079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798a00aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		});

		it("deploys ForeignERC777Bridge", (done) => {
			let validatorpubkeys = validators.reduce((accumulator, currentValue) => {
				accumulator.push(currentValue.public);
				return accumulator;
			}, []);
			ForeignERC777Bridge.new(3, validatorpubkeys, {
				from: bridgeOwner
			}).then(function(_instance) {
				assert.ok(_instance.address);
				foreignERC777Bridge = _instance;
				done();
			});
		});

		it("registers the mapping from main->sidechain token", async () => {

			// by registering a token - a new ERC777 token is created
			// by the bridge.
			// token minting and burning is a reserved privilege for
			// the bridge

			const name = await homeToken.name()
			const symbol = await homeToken.symbol()
			await foreignERC777Bridge.registerToken(homeToken.address, name, symbol, {
				from: bridgeOwner,
			});

			let tokens = await foreignERC777Bridge.tokens();
			assert.equal(tokens.length, 1)

			// find out the newly deployed ERC777 token address
			sidechainTokenAddress = await foreignERC777Bridge.tokenMap(homeToken.address);
			assert.ok(sidechainTokenAddress);

			// and create a sidechain token instance to work with
			sidechainToken = erc777.at(sidechainTokenAddress);

		});
	});

	describe('Cross the bridge: main -> side', () => {

		var mintingHash;

		it("sends 1e18 token units to the HomeBridge", (done) => {

			let data = homeToken.contract.transfer.getData(homeERC20Bridge.address, 1e18);

			const privateKey = Buffer.from(alicePrivate, 'hex');

			const txParams = {
				nonce: '0x00',
				gasPrice: 20e9,
				gasLimit: 1e6,
				to: homeToken.address,
				data: data
			};

			const tx = new EthereumTx(txParams);
			tx.sign(privateKey);
			const serializedTx = tx.serialize();

			web3.eth.sendRawTransaction(serializedTx, function(err, tx) {
				assert.ok(tx);
				mintingHash = tx;
				collectGasStats(tx, 'mainchain', 'deposit ERC20 tokens to bridge', done);
			});
		});

		it("checks if bridge received the tokens", async () => {
			// check homebridge balance
			let homeBridgeBalance = await homeToken.balanceOf(homeERC20Bridge.address);
			assert.equal(homeBridgeBalance.toNumber(), 1e18);
		});

		// now the validators should catch the Transfer event and sign approvals
		// to mint tokens on the side chain
		// the last one to sign automatically mints the tokens.
		it("sign & mint token on sidechain", async () => {
			for (let i = 0; i < requiredValidators; i++) {
				let validatorSignature = utility.signMintRequest(mintingHash, homeToken.address, alicePublic, aliceAmount, validators[i].private);
				let t = await foreignERC777Bridge.signMintRequest(mintingHash, homeToken.address, alicePublic, aliceAmount, validatorSignature.v, validatorSignature.r, validatorSignature.s);
			}
		});

		it("should see that Alice has sidechain balance", async () => {
			let balance = await sidechainToken.balanceOf(alicePublic);
			assert.equal(balance.toNumber(), aliceAmount);
		});
	});


	describe('Cross the bridge: side -> main', () => {

		var withdrawHash;
		var collectedSignatures = [];
		var rewardSignature;

		it("sends 1e18 token units to the SideBridge", (done) => {
			let data = sidechainToken.contract.transfer.getData(foreignERC777Bridge.address, 1e18);

			const privateKey = Buffer.from(alicePrivate, 'hex');

			const txParams = {
				nonce: 1,
				gasPrice: 20e9,
				gasLimit: 1e6,
				to: sidechainToken.address,
				data: data
			};

			const tx = new EthereumTx(txParams);
			tx.sign(privateKey);
			const serializedTx = tx.serialize();

			web3.eth.sendRawTransaction(serializedTx, function(err, tx) {
				assert.isNull(err);
				assert.ok(tx);
				withdrawHash = tx;
				done();
			})

		});


		// now the validators catch the Transfer event , and create the witdraw signatures
		// on the token on the side chain

		it("create token withdrawal validator signatures", async () => {
			// Validators need to look-up the homeTokenaddress from the 
			// sidechain bridge - which they can do from the token mapping 
			// and then they can create their signature

			for (let i = 0; i < requiredValidators + 1; i++) {

				var validatorSignature = utility.signWithdrawRequest(homeToken.address, alicePublic, aliceAmount, 0, validators[i].private);

				// announce validator's signature through the sidechain bridge
				let t = await foreignERC777Bridge.signWithdrawRequest(withdrawHash, homeToken.address, alicePublic, aliceAmount, 0, validatorSignature.v, validatorSignature.r, validatorSignature.s);

				collectedSignatures.push(t.logs[0].args);
			}
		});

		it("recepient of tokens signs off on a reward to withdraw on the main bridge", async () => {
			const withdrawRequestsHash = utility.createWithdrawRequestHash(homeToken.address, alicePublic, aliceAmount, 0);

			// we'll need this later..
			rewardSignature = utility.signReward(withdrawRequestsHash, homeToken.address, alicePublic, aliceAmount, 0, aliceReward, alicePrivate);

			let data = foreignERC777Bridge.contract.signWithdrawRequestReward.getData(withdrawRequestsHash, aliceReward, rewardSignature.v, rewardSignature.r, rewardSignature.s);

			const txParams = {
				nonce: '0x02',
				gasPrice: 20e9,
				gasLimit: 1e6,
				to: foreignERC777Bridge.address,
				data: data
			};

			const tx = new EthereumTx(txParams);
			tx.sign(Buffer.from(alicePrivate, 'hex'));
			const serializedTx = tx.serialize();

			web3.eth.sendRawTransaction(serializedTx, function(err, tx) {
				assert.ok(tx);
			})
		});

		it("takes collected signatures to execute withdraw on main bridge", async () => {
			let _vs = [];
			let _rs = [];
			let _ss = [];

			for (let i = 0; i < collectedSignatures.length; i++) {
				_vs.push(collectedSignatures[i]._v);
				_rs.push(collectedSignatures[i]._r);
				_ss.push(collectedSignatures[i]._s);
			}
			// add the reward signature
			_vs.push(rewardSignature.v);
			_rs.push(rewardSignature.r);
			_ss.push(rewardSignature.s);

			let t = await homeERC20Bridge.withdraw(
				collectedSignatures[0]._mainToken,
				collectedSignatures[0]._recipient,
				collectedSignatures[0]._amount,
				0,
				1,
				_vs,
				_rs,
				_ss);

			await collectGasStats(t.tx, 'mainchain', 'withdraw ERC20 tokens from bridge');
		});

		it("checks if bridge does not have the tokens anymore", async () => {
			// check homebridge balance
			let homeBridgeBalance = await homeToken.balanceOf(homeERC20Bridge.address);
			assert.equal(homeBridgeBalance.toNumber(), 0);
		});
	});

	describe('STATS TIME', () => {
		it("dumps", async () => {
			let stats = {};
			gasStats.forEach(function(item) {
				if (!stats[item.group]) {
					stats[item.group] = {
						cumulative: 0,
						transactions: [],
					};
				}
				stats[item.group].cumulative += item.gasUsed;
				stats[item.group].transactions.push(item);
			});
			Object.keys(stats).forEach(function(key) {
				console.log('-', key);
				for (let i = 0; i < stats[key].transactions.length; i++) {
					let item = stats[key].transactions[i];
					console.log('--', item.name, '=>', item.gasUsed, 'gas used');
				}
				console.log('-- cumulative gas used:', stats[key].cumulative);
			});

		});
	});
});
