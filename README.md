# Test cases assignment
In this assignment, you are required to write some test cases for the stateful smart contract. This contract is based on the previous assignment.

Write positive test cases to ensure that the smart contract works in the intended way and negative test cases to ensure transactions are rejected if they do fail the logic checks within the contract.

## Positive test cases
Complete the code in `test/success_tests.js`. Write test cases to cover these scenarios,

### Deploys game contract successfully 
1. Initial monster health is same as the value specified during deployment.
2. Initial max damage is set to 0.

### Account opts in successfully
1. Initial player damage is set to 0.

### Attacks monster successfully
1. Max damage and monster health is updated.
2. Player damage is updated
3. Highest player damage address is recorded.

### Reward player successfully
1. MVP player receives the reward.

## Negative test cases
Complete the code in `test/negative_tests.js`. Write test cases to cover these scenarios,

1. Initialize monster with < 5 Health fails.
2. Attacking a monster with 0 health fails.
3. Reward player when monster is alive.
4. Reward player fails when address is accounts is different from global state.
5. Reward player fails when called by non-creator

Feel free to include additional test cases if necessary.

## Setup instructions

### Install python packages via AlgoKit
run `algokit bootstrap poetry` within this folder

### Install JS packages
run `yarn install`

### Update environement variables
1. Copy `.env.example` to `.env`
2. Update Algorand Sandbox credentials in `.env` file
3. Update accounts in `.env` file

### Initialize virtual environment
run `poetry shell`

### Compile Contracts
1. run `python game_approval.py`
2. run `python game_clearstate.py`

### Run Tests
1. run `yarn run mocha`