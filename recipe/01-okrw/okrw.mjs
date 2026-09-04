// 4.1 자금 준비 (OKRW)
// 읽기 전용: node okrw.mjs [주소]
// 전송까지:  MAROO_PRIVATE_KEY=0x... TO=0x... AMOUNT=1 node okrw.mjs
import { JsonRpcProvider, Wallet, Contract, formatEther, parseEther, formatUnits } from "ethers";
import { iOkrwAbi } from "@maroo-chain/contracts/abi/precompiles/okrw/IOkrw";

const RPC = process.env.MAROO_RPC ?? "https://rpc-testnet.maroo.io";
const CHAIN_ID = 450815;
const IOKRW = "0x1000000000000000000000000000000000000001";

const provider = new JsonRpcProvider(RPC, CHAIN_ID);

// 1. 체인 확인
const net = await provider.getNetwork();
console.log("chainId:", net.chainId.toString());

// 2. 프리컴파일 파라미터. 하드코딩 대신 항상 여기서 읽는다
const okrw = new Contract(IOKRW, iOkrwAbi, provider);
const { minter, mintDenom } = await okrw.getParams();
console.log("minter:", minter);
console.log("mintDenom:", mintDenom);

// 3. 가스 가격
const fee = await provider.getFeeData();
console.log("gasPrice:", formatUnits(fee.gasPrice, "gwei"), "Gwei");
console.log("plain transfer cost:", formatEther(fee.gasPrice * 21000n), "OKRW");

// 4. 잔고. ETH와 같이 네이티브 잔고다
const key = process.env.MAROO_PRIVATE_KEY;
const wallet = key ? new Wallet(key, provider) : null;
const who = process.argv[2] ?? wallet?.address ?? minter;
console.log("balance of", who + ":", formatEther(await provider.getBalance(who)), "OKRW");

// 5. 전송. 개인키와 TO가 있을 때만
if (wallet && process.env.TO) {
  const amount = process.env.AMOUNT ?? "1";
  const before = await provider.getBalance(process.env.TO);
  const tx = await wallet.sendTransaction({ to: process.env.TO, value: parseEther(amount) });
  console.log("tx:", tx.hash);
  const r = await tx.wait();
  const after = await provider.getBalance(process.env.TO);
  console.log("status:", r.status, "gasUsed:", r.gasUsed.toString(), "logs:", r.logs.length);
  console.log("recipient delta:", formatEther(after - before), "OKRW");
} else {
  console.log("(전송 생략: MAROO_PRIVATE_KEY와 TO를 주면 실행)");
}
