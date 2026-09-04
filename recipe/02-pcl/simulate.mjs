// 4.2 정책 설정: 보내기 전 eth_call 시뮬레이션. 개인키 불필요.
// 실행: PROXY=0x... FROM=0x... node simulate.mjs                 (ERC-20 transfer 1 tOKRW 호출)
//       PROXY=0x... FROM=0x... CALL=pay VALUE=5 node simulate.mjs  (Payout.pay(FROM)에 5 tOKRW 실어 호출)
import { ethers } from "ethers";
import { createRequire } from "module";
const { iPclAbi } = createRequire(import.meta.url)("@maroo-chain/contracts/abi/precompiles/pcl/IPcl");

const RPC = process.env.MAROO_RPC ?? "https://rpc-testnet.maroo.io";
const PROXY = process.env.PROXY ?? "0x5BCEc33cf3f6496dAF27956fd4C4f157ca0342E3"; // 샘플: EAS_POLICY, selector 없음
const FROM = process.env.FROM ?? "0x552B9F6BA65DE19D93F568DEF894d5Efdc1E6866";   // 샘플 프록시의 admin, attestation 보유
const CALL = process.env.CALL ?? "transfer";
const VALUE = ethers.parseEther(process.env.VALUE ?? "0");

const p = new ethers.JsonRpcProvider(RPC);
const errors = new ethers.Interface(iPclAbi.filter((x) => x.type === "error"));
const iface = new ethers.Interface(["function transfer(address,uint256)", "function pay(address)"]);
const data = CALL === "pay" ? iface.encodeFunctionData("pay", [FROM]) : iface.encodeFunctionData("transfer", [FROM, ethers.parseEther("1")]);
const stranger = ethers.Wallet.createRandom().address; // attestation 없음. 잔고는 state override로 채운다
const funded = { [stranger]: { balance: ethers.toQuantity(ethers.parseEther("1000")) } };

async function sim(label, tx, override) {
  try { await p.send("eth_call", override ? [tx, "latest", override] : [tx, "latest"]); console.log(`  ${label}: OK`); }
  catch (e) {
    const raw = e?.data ?? e?.info?.error?.data ?? e?.error?.data;
    let reason = e?.shortMessage ?? e?.message;
    try { const d = errors.parseError(raw); reason = `${d.name}(${d.args.join(", ")})`; } catch {}
    console.log(`  ${label}: REVERT ${reason}`);
  }
}

console.log(`proxy: ${PROXY}  call: ${CALL}  value: ${ethers.formatEther(VALUE)} tOKRW\n`);
const tx = { to: PROXY, data, value: ethers.toQuantity(VALUE) };
await sim(`from=${FROM}`, { ...tx, from: FROM });
await sim("from=attestation 없는 임의 주소", { ...tx, from: stranger }, funded);
await sim("from 생략 (zero address로 평가됨)", tx);
try { console.log(`\n  estimateGas from=${FROM}: ${await p.estimateGas({ ...tx, from: FROM })}`); }
catch (e) { console.log(`\n  estimateGas: REVERT ${e?.shortMessage ?? e?.message}`); }
console.log("\n전역 정책은 eth_call이 평가하지 않는다. 한도는 read-policies.mjs 4번으로 따로 확인한다.");
