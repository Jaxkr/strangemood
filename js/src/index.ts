import * as solana from '@solana/web3.js';
import * as ix from './dao/instructions';

// const test_governance = {
//   governanceProgramId: new solana.PublicKey(
//     'eyoXCKW5rkxbHc1fAXQJry5i6jYyyXk1iDGfKLYErbX'
//   ),
//   communityMint: new solana.PublicKey(
//     '36RC6XAKAnjEYVySfb4k6dnyjWJGgfjRL1oMx3pe9MVL'
//   ),
// };

// export const main = async () => {
//   let signer = solana.Keypair.generate();
//   let conn = new solana.Connection('http://127.0.0.1:8899');

//   // Get some SOL to pay for the transactions
//   let airdropSignature = await conn.requestAirdrop(
//     signer.publicKey,
//     solana.LAMPORTS_PER_SOL * 10
//   );
//   await conn.confirmTransaction(airdropSignature);

//   console.log('creating dao');
//   const dao = await createDAO(
//     conn,
//     test_governance.governanceProgramId,
//     signer,
//     100000, // inital supply
//     'hey',
//     {
//       expansion_rate_amount: 1,
//       expansion_rate_decimals: 2,

//       sol_contribution_rate_amount: 5,
//       sol_contribution_rate_decimals: 2,

//       vote_contribution_rate_amount: 5,
//       vote_contribution_rate_decimals: 2,

//       authority: signer.publicKey,
//     }
//   );
//   console.log('Created DAO!');

//   let wrappedSol = new splToken.Token(
//     conn,
//     splToken.NATIVE_MINT,
//     splToken.TOKEN_PROGRAM_ID,
//     signer
//   );
//   let sol_acct = await wrappedSol.getOrCreateAssociatedAccountInfo(
//     signer.publicKey
//   );

//   let votes = new splToken.Token(
//     conn,
//     dao.communityMint,
//     splToken.TOKEN_PROGRAM_ID,
//     signer
//   );
//   let vote_acct = await votes.getOrCreateAssociatedAccountInfo(
//     signer.publicKey
//   );

//   const { listing, listingMint } = await createListing(
//     conn,
//     {
//       signer: signer,
//       payer: signer,
//     },
//     {
//       solDeposit: sol_acct.address,
//       voteDeposit: vote_acct.address,
//       realm: dao.realm,
//       charter: dao.charter,
//       charterGovernance: dao.charterGovernance,
//       governanceProgramId: test_governance.governanceProgramId,
//       priceInLamports: 1000,
//     }
//   );

//   console.log('purchasing listing');
//   const listingTokenAccount = await purchaseListing(
//     conn,
//     {
//       signer: signer,
//       payer: signer,
//     },
//     {
//       listing: listing.publicKey,
//       realm: dao.realm,
//       communityMint: dao.communityMint,
//       charterGovernance: dao.charterGovernance,
//       charter: dao.charter,
//       governanceProgramId: test_governance.governanceProgramId,
//     }
//   );

//   console.log('purchased listing', listingTokenAccount);
// };

// console.log('starting');
// main()
//   .catch(console.error)
//   .then(() => console.log('done'));

import fs from 'fs/promises';
import { Charter } from './dao/types';
import { CharterLayout } from './dao/state';
import { MAINNET } from './constants';

async function main() {
  const args = process.argv.slice(2);

  if (args.length != 2) {
    throw new Error('Need two args');
  }

  let realm_sol_token_account = new solana.PublicKey(args[0]);
  let realm_vote_token_account = new solana.PublicKey(args[1]);

  const conn = new solana.Connection(
    solana.clusterApiUrl('testnet'),
    'confirmed'
  );

  const defaultKeypairArray = JSON.parse(
    await fs.readFile('~/.config/solana/id.json', 'utf8')
  );
  const secretKey = Uint8Array.from(defaultKeypairArray);
  let signer = solana.Keypair.fromSecretKey(secretKey);

  const charterKeypair = solana.Keypair.generate();
  let balance = await conn.getMinimumBalanceForRentExemption(
    CharterLayout.span
  );
  let charter: Charter = {
    expansion_rate_amount: 30,
    expansion_rate_decimals: 0,
    sol_contribution_rate_amount: 5,
    sol_contribution_rate_decimals: 2,
    vote_contribution_rate_amount: 20,
    vote_contribution_rate_decimals: 2,
    authority: signer.publicKey,
    realm_sol_token_account,
    realm_vote_token_account,
  };

  const create_empty_charter_tx = ix.createEmptyCharterAccount({
    lamportsForRent: balance,
    payerPubkey: signer.publicKey,
    newAccountPubkey: charterKeypair.publicKey,
    owner: MAINNET.STRANGEMOOD_PROGRAM_ID,
  });

  // Update the charter details
  const set_charter_tx = ix.setCharterAccount({
    charterData: {
      expansion_rate_amount: charter.expansion_rate_amount,
      expansion_rate_decimals: charter.expansion_rate_decimals,
      sol_contribution_rate_amount: charter.sol_contribution_rate_amount,
      sol_contribution_rate_decimals: charter.sol_contribution_rate_decimals,
      vote_contribution_rate_amount: charter.vote_contribution_rate_amount,
      vote_contribution_rate_decimals: charter.vote_contribution_rate_decimals,

      // TODO: Look how token governances assign their authorities
      // and then use that to give the update authority of the charter
      // to the Realm.
      authority: signer.publicKey,
      realm_sol_token_account: MAINNET.STRANGEMOOD_FOUNDATION_SOL_ACCOUNT,
      realm_vote_token_account: MAINNET.STRANGEMOOD_FOUNDATION_VOTE_ACCOUNT,
    },
    charterPubkey: charterKeypair.publicKey,
    signer: signer.publicKey,
  });

  const tx = new solana.Transaction();
  tx.add(create_empty_charter_tx);
  tx.add(set_charter_tx);

  await solana.sendAndConfirmTransaction(conn, tx, [signer, charterKeypair]);
}

main().catch(console.error);
