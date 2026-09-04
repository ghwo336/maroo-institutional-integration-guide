// 테스트넷 Privacy 프리컴파일에 상태 변경 호출을 실제로 시도해 정확한 오류를 기록한다. 개인키 불필요(eth_call, estimateGas).
// 증명 재료가 없으므로 인자는 더미다. 목적은 프리컴파일이 어느 단계에서 어떤 이유로 거절하는지 남기는 것.
// 실행: node privacy-deposit-probe.mjs   (recipe/에서 npm install 후, recipe/node_modules를 참조)
import { createRequire } from "module";
const require = createRequire(new URL("../../recipe/package.json", import.meta.url));
const { ethers } = require("ethers");
const { iPrivacyAbi } = require("@maroo-chain/contracts/abi/precompiles/privacy/IPrivacy");
const { iPclAbi } = require("@maroo-chain/contracts/abi/precompiles/pcl/IPcl");

const RPC = "https://rpc-testnet.maroo.io";
const PRIVACY = "0x100000000000000000000000000000000000000b";
const ATTESTED_BANK_SCHEMA = "0x552B9F6BA65DE19D93F568DEF894d5Efdc1E6866"; // 은행 KYC 스키마 0xc74e attestation 보유. kakaoIdHash 스키마는 미확인
const MINTER = "0x83cbcef68d5989a30795ce63c9617aa93016f63f";
const p = new ethers.JsonRpcProvider(RPC);
const priv = new ethers.Interface(iPrivacyAbi);
const errs = new ethers.Interface([...iPclAbi.filter((x) => x.type === "error"), "error Error(string)", "error Panic(uint256)"]);
const rnd = ethers.Wallet.createRandom().address;
const funded = (a) => ({ [a]: { balance: ethers.toQuantity(ethers.parseEther("100")) } });

function reason(e) {
  const raw = e?.data ?? e?.info?.error?.data ?? e?.error?.data;
  if (!raw || raw === "0x") return `(revert data 없음) ${e?.shortMessage ?? e?.message}`;
  try { const d = errs.parseError(raw); return `${d.name}(${d.args.join(", ")})`; } catch { return `미확인 revert data ${String(raw).slice(0, 10)}… (${String(raw).length / 2 - 1} bytes)`; }
}
async function call(label, tx, override) {
  try { const r = await p.send("eth_call", override ? [tx, "latest", override] : [tx, "latest"]); console.log(`  ${label}: OK return=${r}`); }
  catch (e) { console.log(`  ${label}: REVERT ${reason(e)}`); }
}
async function gas(label, tx) {
  try { console.log(`  ${label}: estimateGas ${await p.estimateGas(tx)}`); } catch (e) { console.log(`  ${label}: estimateGas REVERT ${reason(e)}`); }
}

console.log(`# Privacy 프리컴파일 상태 변경 호출 시도 (테스트넷, 더미 인자)  date: ${new Date().toISOString().slice(0, 10)}`);
console.log(`rpc: ${RPC}  chainId: ${(await p.getNetwork()).chainId}  block: ${await p.getBlockNumber()}`);
console.log(`privacy: ${PRIVACY}  eth_getCode: ${await p.getCode(PRIVACY)}\n`);

console.log("1. [대조군] 모르는 selector. 프리컴파일이면 revert로 답한다");
await call("0xdeadbeef from=attested", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: "0xdeadbeef" });

const dummy32 = ethers.hexlify(ethers.randomBytes(32));
const depositData = priv.encodeFunctionData("deposit", [{ noteCommitment: dummy32, encryptedNote: ethers.hexlify(ethers.randomBytes(64)), proof: ethers.hexlify(ethers.randomBytes(256)) }]);
const v = ethers.toQuantity(ethers.parseEther("1"));
console.log("\n2. deposit(더미 commitment, 더미 노트, 더미 proof) value=1 tOKRW");
await call("from=attested(은행 스키마)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: depositData, value: v });
await call("from=minter", { from: MINTER, to: PRIVACY, data: depositData, value: v });
await call("from=임의 주소(잔고 override)", { from: rnd, to: PRIVACY, data: depositData, value: v }, funded(rnd));
await gas("from=attested(은행 스키마)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: depositData, value: v });

const canon = ethers.zeroPadValue("0x01", 32); // 필드 원소 범위 안의 commitment
const depositCanon = priv.encodeFunctionData("deposit", [{ noteCommitment: canon, encryptedNote: ethers.hexlify(ethers.randomBytes(64)), proof: ethers.hexlify(ethers.randomBytes(256)) }]);
console.log("\n2b. deposit(canonical commitment 0x00…01, 더미 노트, 더미 proof) value=1 tOKRW. 입력 검증을 지나면 어느 단계가 거절하는가");
await call("from=attested(은행 스키마)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: depositCanon, value: v });
await call("from=임의 주소(잔고 override)", { from: rnd, to: PRIVACY, data: depositCanon, value: v }, funded(rnd));
await call("from=임의 주소, value=0", { from: rnd, to: PRIVACY, data: depositCanon }, funded(rnd));
await gas("from=attested(은행 스키마)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: depositCanon, value: v });

console.log("\n3. deposit 인자 비움 (commitment, 노트, proof 모두 0x)");
await call("from=attested(은행 스키마)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: priv.encodeFunctionData("deposit", [{ noteCommitment: "0x", encryptedNote: "0x", proof: "0x" }]), value: v });

const withdrawData = priv.encodeFunctionData("withdraw", [{ proof: ethers.hexlify(ethers.randomBytes(256)), root: dummy32, nullifier: dummy32, amount: "1000000000000000000", recipient: ATTESTED_BANK_SCHEMA, chainId: "450815", expiresAtUnix: BigInt(Math.floor(Date.now() / 1000) + 3600) }]);
console.log("\n4. withdraw(더미 proof, 더미 root, 더미 nullifier)");
await call("from=attested(은행 스키마)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: withdrawData });
await call("from=임의 주소(잔고 override)", { from: rnd, to: PRIVACY, data: withdrawData }, funded(rnd));

console.log("\n4b. withdraw amount 문자열 형식 변형");
for (const amt of ["1", "1000000000000000000atokrw", "1atokrw", "1aokrw", "1.0"]) {
  const d = priv.encodeFunctionData("withdraw", [{ proof: ethers.hexlify(ethers.randomBytes(256)), root: canon, nullifier: canon, amount: amt, recipient: ATTESTED_BANK_SCHEMA, chainId: "450815", expiresAtUnix: BigInt(Math.floor(Date.now() / 1000) + 3600) }]);
  await call(`amount="${amt}" from=attested(은행 스키마)`, { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: d });
}

console.log("\n5. 메서드 목록 (ABI 0.0.8)");
console.log("  " + iPrivacyAbi.filter((f) => f.type === "function").map((f) => f.name).join(", "));
