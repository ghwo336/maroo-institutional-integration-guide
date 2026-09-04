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
const ATTESTED_BANK_SCHEMA = "0x552B9F6BA65DE19D93F568DEF894d5Efdc1E6866"; // 실습용 은행 스키마 0xc74e attestation과, 2026-09-04 kyc-testnet.maroo.io 카카오 인증으로 받은 kakaoIdHash attestation 보유
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
  try { const r = await p.send("eth_call", override ? [tx, "latest", override] : [tx, "latest"]); const s = `OK return=${r}`; console.log(`  ${label}: ${s}`); return s; }
  catch (e) { const s = `REVERT ${reason(e)}`; console.log(`  ${label}: ${s}`); return s; }
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
await call("from=attested(KYC 지갑)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: depositData, value: v });
await call("from=minter", { from: MINTER, to: PRIVACY, data: depositData, value: v });
await call("from=임의 주소(잔고 override)", { from: rnd, to: PRIVACY, data: depositData, value: v }, funded(rnd));
await gas("from=attested(KYC 지갑)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: depositData, value: v });

const canon = ethers.zeroPadValue("0x01", 32); // 필드 원소 범위 안의 commitment
const depositCanon = priv.encodeFunctionData("deposit", [{ noteCommitment: canon, encryptedNote: ethers.hexlify(ethers.randomBytes(64)), proof: ethers.hexlify(ethers.randomBytes(256)) }]);
console.log("\n2b. deposit(canonical commitment 0x00…01, 더미 노트, 더미 proof) value=1 tOKRW. 입력 검증을 지나면 어느 단계가 거절하는가");
await call("from=attested(KYC 지갑)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: depositCanon, value: v });
await call("from=임의 주소(잔고 override)", { from: rnd, to: PRIVACY, data: depositCanon, value: v }, funded(rnd));
await call("from=임의 주소, value=0", { from: rnd, to: PRIVACY, data: depositCanon }, funded(rnd));
await gas("from=attested(KYC 지갑)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: depositCanon, value: v });

console.log("\n3. deposit 인자 비움 (commitment, 노트, proof 모두 0x)");
await call("from=attested(KYC 지갑)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: priv.encodeFunctionData("deposit", [{ noteCommitment: "0x", encryptedNote: "0x", proof: "0x" }]), value: v });

const withdrawData = priv.encodeFunctionData("withdraw", [{ proof: ethers.hexlify(ethers.randomBytes(256)), root: dummy32, nullifier: dummy32, amount: "1000000000000000000", recipient: ATTESTED_BANK_SCHEMA, chainId: "450815", expiresAtUnix: BigInt(Math.floor(Date.now() / 1000) + 3600) }]);
console.log("\n4. withdraw(더미 proof, 더미 root, 더미 nullifier)");
await call("from=attested(KYC 지갑)", { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: withdrawData });
await call("from=임의 주소(잔고 override)", { from: rnd, to: PRIVACY, data: withdrawData }, funded(rnd));

console.log("\n4b. withdraw amount 문자열 형식 변형");
const wd = (amt, chain, from) => priv.encodeFunctionData("withdraw", [{ proof: ethers.hexlify(ethers.randomBytes(256)), root: canon, nullifier: canon, amount: amt, recipient: from, chainId: chain, expiresAtUnix: BigInt(Math.floor(Date.now() / 1000) + 3600) }]);
const r4b = {};
for (const amt of ["1", "1000000000000000000atokrw", "1atokrw", "1aokrw", "1.0"]) {
  r4b[amt] = await call(`amount="${amt}" from=attested(KYC 지갑)`, { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: wd(amt, "450815", ATTESTED_BANK_SCHEMA) });
}

console.log("\n4c. 같은 withdraw를 attestation 없는 임의 주소로. 정책 층이 먼저 막는가");
r4b.rnd = await call(`amount="1atokrw" from=임의 주소(잔고 override)`, { from: rnd, to: PRIVACY, data: wd("1atokrw", "450815", rnd) }, funded(rnd));

console.log("\n4d. chainId 문자열 변형. 문서 Network ID 값과 실제 Cosmos chain-id");
r4b.docChain = await call(`chainId="maroo-testnet" from=attested(KYC 지갑)`, { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: wd("1atokrw", "maroo-testnet", ATTESTED_BANK_SCHEMA) });
r4b.realChain = await call(`chainId="maroo-testnet-1" from=attested(KYC 지갑)`, { from: ATTESTED_BANK_SCHEMA, to: PRIVACY, data: wd("1atokrw", "maroo-testnet-1", ATTESTED_BANK_SCHEMA) });

// 4e. 은행 스키마(bool kycVerified, 0xc74e…)만 있는 지갑. 2026-09-05 step2.ts로 발급, kakaoIdHash는 없음
const BANK_ONLY = "0x99DF6BD2225C9C29F38708b397B36F64CB2E3D66";
const KSTOCK_PROXY = "0x5BCEc33cf3f6496dAF27956fd4C4f157ca0342E3"; // 0xc74e 스키마 EAS_POLICY가 바인딩된 실습 프록시
console.log("\n4e. 은행 스키마 attestation만 있는 지갑. attestation이 있느냐가 아니라 어느 스키마냐를 보는가");
const erc20 = new ethers.Interface(["function transfer(address,uint256) returns (bool)"]);
r4b.bankProxy = await call(`KSTOCK 프록시(0xc74e 정책) transfer from=은행 스키마만`, { from: BANK_ONLY, to: KSTOCK_PROXY, data: erc20.encodeFunctionData("transfer", [BANK_ONLY, 0n]) });
r4b.bankPrivacy = await call(`Privacy withdraw amount="1atokrw" from=은행 스키마만`, { from: BANK_ONLY, to: PRIVACY, data: wd("1atokrw", "maroo-testnet-1", BANK_ONLY) }, funded(BANK_ONLY));

console.log("\n5. 메서드 목록 (ABI 0.0.8)");
console.log("  " + iPrivacyAbi.filter((f) => f.type === "function").map((f) => f.name).join(", "));

const trim = (s) => (s ?? "").replace(/^REVERT /, "").replace(/: invalid request\)$/, ")");
console.log("\n요약. Privacy 프리컴파일은 어디서 막는가 (전부 eth_call, 상태 변경 없음)");
console.log(`  1. 정책 층    attestation 없는 주소            → ${trim(r4b.rnd)}`);
console.log(`                은행 스키마만 있는 주소, KSTOCK 프록시 → ${trim(r4b.bankProxy)}`);
console.log(`                은행 스키마만 있는 주소, Privacy      → ${trim(r4b.bankPrivacy)}`);
console.log(`  2. chain id   인증 지갑, EVM chainId "450815"  → ${trim(r4b["1atokrw"])}`);
console.log(`                문서 Network ID "maroo-testnet"  → ${trim(r4b.docChain)}`);
console.log(`                실제 chain-id "maroo-testnet-1"   → ${trim(r4b.realChain)}`);
console.log(`  3. 증명 재료  형식 맞춘 더미 deposit           → 2b 참조. 암호화 노트 봉투 검사에서 거절. prover 미공개로 여기서 멈춤`);
console.log(`  덤. denom     문서 표기 "aokrw"                → ${trim(r4b["1aokrw"])}`);
