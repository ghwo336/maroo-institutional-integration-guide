// PCL 읽기 전용 검증. 개인키 불필요. 모든 호출은 eth_call.
// 실행: node pcl-readonly-probe.mjs   (ethers v6, @maroo-chain/contracts 필요)
import { ethers } from "ethers";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { iPclAbi } = require("@maroo-chain/contracts/abi/precompiles/pcl/IPcl");

const RPC = "https://rpc-testnet.maroo.io";
const PCL = "0x1000000000000000000000000000000000000005";
const SCHEMA_REGISTRY = "0x1000000000000000000000000000000000000006";
const INDEXER = "0x1000000000000000000000000000000000000008";
// 이전 실습(2026-08-22)에서 배포한 PCL 프록시와 그 뒤의 구현 컨트랙트(KRWStockV2, OZ ERC20Upgradeable)
const PROXY = "0x5BCEc33cf3f6496dAF27956fd4C4f157ca0342E3";
const IMPL = "0x805F34f3Fa7211A491Bd62a0468b23C786b7AA17";
const ATTESTED = "0x552B9F6BA65DE19D93F568DEF894d5Efdc1E6866"; // 프록시 admin. 스키마 0xc74e... attestation 보유
const TO = "0x482F915080Dd5Ea014347cC11aE907e9e15BAe1E";
const UNATTESTED = ethers.Wallet.createRandom().address; // attestation 없음, 잔고 없음, 키 불필요

const p = new ethers.JsonRpcProvider(RPC);
const pcl = new ethers.Contract(PCL, iPclAbi, p);
const coder = ethers.AbiCoder.defaultAbiCoder();
const erc20 = new ethers.Interface([
  "function transfer(address,uint256) returns (bool)",
  "function name() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
]);
const errIface = new ethers.Interface([...iPclAbi.filter((x) => x.type === "error"), ...erc20.fragments.filter((f) => f.type === "error")]);
const J = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));
const okrw = (x) => `${ethers.formatEther(x)} tOKRW`;

function decodeErr(e) {
  const data = e?.data ?? e?.info?.error?.data ?? e?.error?.data;
  if (!data) return `(revert data 없음) ${e?.shortMessage ?? e?.message}`;
  try { const d = errIface.parseError(data); return `${d.name}(${d.args.join(", ")})`; }
  catch { return `미확인 selector ${String(data).slice(0, 10)}`; }
}
async function sim(label, tx, override) {
  try {
    const r = override ? await p.send("eth_call", [tx, "latest", override]) : await p.call(tx);
    console.log(`  ${label}: OK  return=${r.slice(0, 66)}${r.length > 66 ? "..." : ""}`);
  } catch (e) { console.log(`  ${label}: REVERT  ${decodeErr(e)}`); }
}

// 정책 트리 디코더 (IPcl.sol 구조체 기준)
const PS = "tuple(string templateId, bytes policy, bytes selector)";
const structOf = {
  EAS_POLICY: "tuple(address easContract,address indexContract,bytes32 schemaUid)",
  DENYLIST_POLICY: "tuple(address[] addresses)",
  VOLUME_POLICY: "tuple(string[] tokens, tuple(uint256 minLimit,uint256 maxLimit)[] limits)",
  PERIODIC_VOLUME_POLICY: "tuple(string[] tokens, tuple(uint256 maxAmount,uint64 resetPeriodSeconds)[] limits)",
  OKRW_EAS_TRANSFER_LIMIT_POLICY: "tuple(address easContract,address indexContract,bytes32 schemaUid,uint256 transferLimitAmount)",
  OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY: "tuple(address easContract,address indexContract,bytes32 schemaUid,uint256 maxAmount,uint64 resetPeriodSeconds)",
  AGENT_OKRW_TRANSFER_LIMIT_POLICY: "tuple(uint256 reserved)",
  LOGICAL_POLICY: `tuple(uint8 quantifier, ${PS}[] children)`,
  FOR_EACH_POLICY: `tuple(uint8 quantifier, uint8 subject, ${PS} child)`,
};
function showPolicy(ps, depth) {
  const ind = "  ".repeat(depth);
  const t = ps.templateId, sel = ps.selector === "0x" ? "(모든 호출)" : ps.selector;
  const [d] = coder.decode([structOf[t]], ps.policy);
  if (t === "LOGICAL_POLICY") { console.log(`${ind}${t} ${["Unspecified", "And", "Or"][Number(d.quantifier)]} selector=${sel}`); d.children.forEach((c) => showPolicy(c, depth + 1)); }
  else if (t === "FOR_EACH_POLICY") { console.log(`${ind}${t} ${["Unspecified", "Any", "Every"][Number(d.quantifier)]} subject=${["Unspecified", "AgentOwners"][Number(d.subject)]} selector=${sel}`); showPolicy(d.child, depth + 1); }
  else if (t === "VOLUME_POLICY") console.log(`${ind}${t} tokens=${J(d.tokens)} 단건 ${d.limits.map((l) => `min ${okrw(l.minLimit)} max ${okrw(l.maxLimit)}`).join("; ")} selector=${sel}`);
  else if (t === "PERIODIC_VOLUME_POLICY") console.log(`${ind}${t} tokens=${J(d.tokens)} 누적 ${d.limits.map((l) => `max ${okrw(l.maxAmount)} / ${l.resetPeriodSeconds}s`).join("; ")} selector=${sel}`);
  else if (t === "EAS_POLICY") console.log(`${ind}${t} eas=${d.easContract} indexer=${d.indexContract} schemaUid=${d.schemaUid} selector=${sel}`);
  else console.log(`${ind}${t} ${J(d)} selector=${sel}`);
}

console.log(`# PCL 읽기 전용 검증 (테스트넷)  date: ${new Date().toISOString().slice(0, 10)}`);
console.log(`rpc: ${RPC}  chainId: ${(await p.getNetwork()).chainId}  block: ${await p.getBlockNumber()}`);
console.log(`proxy: ${PROXY}  impl: ${IMPL}`);
console.log(`attested: ${ATTESTED}  unattested(random): ${UNATTESTED}\n`);

console.log("1. [프리컴파일 생존 확인] eth_getCode는 비어 있어도 호출에는 답한다");
console.log(`  eth_getCode(PCL): ${await p.getCode(PCL)}`);
console.log(`  policyAdmin(): ${await pcl.policyAdmin()}`);
const params = await pcl.getParams();
console.log(`  getParams(): policyAdmin=${params.policyAdmin} entrypoints=${J(params.entrypoints)}`);
await sim("알 수 없는 selector 0xdeadbeef", { to: PCL, data: "0xdeadbeef" });
console.log();

console.log("2. [등록된 템플릿] policyTemplate(id)");
for (const t of Object.keys(structOf).concat(["NOT_A_TEMPLATE"])) {
  try { const r = await pcl.policyTemplate(t); console.log(`  ${t}: ${r.name}`); }
  catch (e) { console.log(`  ${t}: REVERT ${decodeErr(e)}`); }
}
console.log();

console.log("3. [전역 정책] globalPolicies() 디코드. 모든 tx에 AnteHandler가 적용");
const g = await pcl.globalPolicies();
g.policies.forEach((ps, i) => { console.log(`  [${i}]`); showPolicy(ps, 2); });
const reg = new ethers.Contract(SCHEMA_REGISTRY, ["function getSchema(bytes32) view returns ((bytes32 uid, address resolver, bool revocable, string schema))"], p);
const uids = new Set(); const collect = (ps) => { const t = ps.templateId; const [d] = coder.decode([structOf[t]], ps.policy); if (t === "LOGICAL_POLICY") d.children.forEach(collect); else if (t === "FOR_EACH_POLICY") collect(d.child); else if (d.schemaUid) uids.add(d.schemaUid); };
g.policies.forEach(collect);
for (const uid of uids) { const s = await reg.getSchema(uid); console.log(`  스키마 ${uid}: "${s.schema}" resolver=${s.resolver} revocable=${s.revocable}`); }
const gpv = await pcl.globalPeriodicVolume(ATTESTED, "atokrw", 86400, false);
console.log(`  globalPeriodicVolume(attested, "atokrw", 86400): ${gpv.map((s) => `amount=${okrw(s.amount)} max=${okrw(s.maxAmount)} resetAt=${s.resetAt}`).join("; ") || "(없음)"}`);
console.log(`  globalOkrwEasPeriodicVolume(attested): ${J(await pcl.globalOkrwEasPeriodicVolume(ATTESTED))}  (OKRW_EAS 변형 미등록이라 0)`);
console.log();

console.log("4. [프록시 레지스트리와 컨트랙트 정책]");
console.log(`  pclProxy(proxy).kind = ${(await pcl.pclProxy(PROXY)).kind} (1=Transparent)   pclProxy(impl).kind = ${(await pcl.pclProxy(IMPL)).kind} (0=미등록)`);
console.log(`  eth_getCode 길이: proxy ${(await p.getCode(PROXY)).length / 2 - 1} bytes, impl ${(await p.getCode(IMPL)).length / 2 - 1} bytes`);
const cfg = await pcl.contractPolicies(PROXY);
console.log(`  contractPolicies(proxy): admin=${cfg.admin}`); cfg.policies.forEach((ps) => showPolicy(ps, 2));
const idx = new ethers.Contract(INDEXER, ["function getReceivedAttestationUIDCount(address,bytes32) view returns (uint256)"], p);
const cs = coder.decode([structOf.EAS_POLICY], cfg.policies[0].policy)[0];
console.log(`  Indexer 색인 수: attested=${await idx.getReceivedAttestationUIDCount(ATTESTED, cs.schemaUid)}  unattested=${await idx.getReceivedAttestationUIDCount(UNATTESTED, cs.schemaUid)}  (스키마 ${cs.schemaUid.slice(0, 10)}...)`);
console.log();

const transfer1 = erc20.encodeFunctionData("transfer", [TO, ethers.parseEther("1")]);
console.log("5. [규제 트랙 시뮬레이션] 프록시로 eth_call. from에 따라 결과가 갈린다");
await sim("transfer  from=unattested", { from: UNATTESTED, to: PROXY, data: transfer1 });
await sim("transfer  from=attested  ", { from: ATTESTED, to: PROXY, data: transfer1 });
await sim("transfer  from 생략       ", { to: PROXY, data: transfer1 });
console.log(`  estimateGas transfer from=attested: ${await p.estimateGas({ from: ATTESTED, to: PROXY, data: transfer1 })}`);
console.log();

console.log("6. [view도 정책 대상] selector 없이 바인딩하면 읽기 호출도 막힌다");
await sim("name()      from=unattested", { from: UNATTESTED, to: PROXY, data: erc20.encodeFunctionData("name", []) });
await sim("name()      from=attested  ", { from: ATTESTED, to: PROXY, data: erc20.encodeFunctionData("name", []) });
await sim("balanceOf() from 생략       ", { to: PROXY, data: erc20.encodeFunctionData("balanceOf", [ATTESTED]) });
console.log();

console.log("7. [대조군: 개방 트랙] 구현 컨트랙트 직접 호출. PCL 에러가 아니라 토큰 자체 에러만 나온다");
await sim("impl.transfer from=unattested", { from: UNATTESTED, to: IMPL, data: transfer1 });
await sim("impl.name()   from=unattested", { from: UNATTESTED, to: IMPL, data: erc20.encodeFunctionData("name", []) });
console.log();

console.log("8. [훅 직접 호출] EOA가 preCall을 부르면");
await sim("PCL.preCall(proxy, attested, 0x, 0) from=attested", { from: ATTESTED, to: PCL, data: pcl.interface.encodeFunctionData("preCall", [PROXY, ATTESTED, "0x", 0]) });
console.log();

console.log("9. [정책 쓰기 경로의 에러] changeContractPolicies eth_call");
const easBytes = coder.encode([structOf.EAS_POLICY], [[cs.easContract, cs.indexContract, cs.schemaUid]]);
const change = (c, admin, policies) => pcl.interface.encodeFunctionData("changeContractPolicies", [{ _contract: c, admin, policies }]);
await sim("proxy, from=비admin, 유효한 EAS_POLICY       ", { from: UNATTESTED, to: PCL, data: change(PROXY, UNATTESTED, [{ templateId: "EAS_POLICY", policy: easBytes, selector: "0x" }]) });
await sim("impl(프록시 아님, 미바인딩), from=임의 주소   ", { from: UNATTESTED, to: PCL, data: change(IMPL, UNATTESTED, [{ templateId: "EAS_POLICY", policy: easBytes, selector: "0x" }]) });
await sim("proxy, from=admin, 없는 templateId          ", { from: ATTESTED, to: PCL, data: change(PROXY, ATTESTED, [{ templateId: "NOT_A_TEMPLATE", policy: easBytes, selector: "0x" }]) });
await sim("proxy, from=admin, selector 3바이트          ", { from: ATTESTED, to: PCL, data: change(PROXY, ATTESTED, [{ templateId: "EAS_POLICY", policy: easBytes, selector: "0xa9059c" }]) });
await sim("proxy, from=admin, selector=transfer 4바이트 ", { from: ATTESTED, to: PCL, data: change(PROXY, ATTESTED, [{ templateId: "EAS_POLICY", policy: easBytes, selector: "0xa9059cbb" }]) });
console.log();

console.log("10. [전역 정책은 eth_call에 없다] 잔고 state override로 임의 주소가 네이티브 전송");
const rich = ethers.Wallet.createRandom().address;
const override = { [rich]: { balance: ethers.toQuantity(ethers.parseEther("30000000")) } };
for (const amt of ["1", "2000001", "20000000"]) await sim(`native ${amt} tOKRW from=임의 주소(override 잔고 3천만)`, { from: rich, to: TO, value: ethers.toQuantity(ethers.parseEther(amt)) }, override);
console.log(`  estimateGas native 3,000,000 tOKRW from=임의 주소(override): ${await p.send("eth_estimateGas", [{ from: rich, to: TO, value: ethers.toQuantity(ethers.parseEther("3000000")) }, "latest", override]).then((x) => parseInt(x, 16)).catch((e) => "ERR " + e.message)}`);
