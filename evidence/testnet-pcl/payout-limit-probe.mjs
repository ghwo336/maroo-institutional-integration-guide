// 마루 문서에 적힌 대로 따라 하며 문서 주장과 다른 곳을 찾는 스크립트. 개인키가 필요하다.
// 각 단계에 재현하는 문서 페이지(docs.maroo.io 경로)와 그 문서의 주장을 적었다. 결과가 다르면 그것이 기록이다.
//
//   MAROO_PRIVATE_KEY=0x...  node payout-limit-probe.mjs                 # 전체 실행
//   node payout-limit-probe.mjs --dry                                    # 키 없이 인코딩만 출력
//
// 선택 env
//   KYC_USER_KEY   attestation이 없는 지갑의 키. 잔고 30 tOKRW 이상이면 실제 거절 tx까지 만든다.
//   PAYOUT_PROXY   이미 배포한 프록시 주소. 있으면 A, B, D를 건너뛴다.
//
// 문서와 다르게 한 것은 두 가지뿐이고 각각 표시했다.
//   (1) 한도 금액. 문서 예제는 1,000만 OKRW, 여기는 테스트 가능한 10 / 25 tOKRW.
//   (2) attestation 없는 주소의 시뮬레이션에 잔고 state override를 쓴다. 문서에는 없는 방법이다.
import { ethers } from "ethers";
import { createRequire } from "module";
import { readFileSync } from "fs";
const require = createRequire(import.meta.url);
const { iPclAbi } = require("@maroo-chain/contracts/abi/precompiles/pcl/IPcl");
const payout = JSON.parse(readFileSync(new URL("./contracts/Payout.json", import.meta.url)));

const RPC = "https://rpc-testnet.maroo.io";
const PCL = "0x1000000000000000000000000000000000000005";
const EAS = "0x1000000000000000000000000000000000000007";
const INDEXER = "0x1000000000000000000000000000000000000008";
const SCHEMA_UID = "0xc74ecef5301b91fbff53451f7e66cafd41871e4f02e3c38766b9d8139f641a63"; // "bool kycVerified", 이전 실습에서 등록
const TO = "0x482F915080Dd5Ea014347cC11aE907e9e15BAe1E";
const SINGLE_LIMIT = ethers.parseEther("10");   // 문서 예제 10,000,000 OKRW 대신 (1)
const PERIOD_MAX = ethers.parseEther("25");     // (1)
const PERIOD_SEC = 86400n;
const DRY = process.argv.includes("--dry");

const p = new ethers.JsonRpcProvider(RPC);
const coder = ethers.AbiCoder.defaultAbiCoder();
const payIface = new ethers.Interface(payout.abi);
const PAY = (to) => payIface.encodeFunctionData("pay", [to]);
const VERSION = payIface.encodeFunctionData("version", []);
const errIface = new ethers.Interface([...iPclAbi.filter((x) => x.type === "error"), "error Error(string)"]);
const easIface = new ethers.Interface([
  "function attest((bytes32 schema,(address recipient,uint64 expirationTime,bool revocable,bytes32 refUID,bytes data,uint256 value) data) request) payable returns (bytes32)",
  "function revoke((bytes32 schema,(bytes32 uid,uint256 value) data) request) payable",
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
  "event Revoked(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
]);
const indexerIface = new ethers.Interface(["function indexAttestation(bytes32 attestationUID)", "function getReceivedAttestationUIDCount(address recipient, bytes32 schemaUID) view returns (uint256)"]);
const okrw = (x) => `${ethers.formatEther(x)} tOKRW`;
const J = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));
function decodeErr(e) {
  const data = e?.data ?? e?.info?.error?.data ?? e?.error?.data;
  if (!data || data === "0x") return `(revert data 없음) ${e?.shortMessage ?? e?.message ?? e}`;
  try { const d = errIface.parseError(data); return `${d.name}(${d.args.join(", ")})`; } catch { return `미확인 selector ${String(data).slice(0, 10)}`; }
}
async function sim(label, tx, override) {
  try { const r = await p.send("eth_call", override ? [tx, "latest", override] : [tx, "latest"]); console.log(`   ${label}: OK ${r.length > 66 ? r.slice(0, 66) + "..." : r}`); return true; }
  catch (e) { console.log(`   ${label}: REVERT ${decodeErr(e)}`); return false; }
}
const overrideFor = (addr) => ({ [addr]: { balance: ethers.toQuantity(ethers.parseEther("1000")) } }); // (2)
async function traceSummary(hash) {
  const tr = await p.send("debug_traceTransaction", [hash, { tracer: "callTracer" }]);
  const NAME = { [PCL]: "PCL" };
  const frames = (tr.calls ?? []).map((c) => `${c.type} ${NAME[ethers.getAddress(c.to)] ?? c.to.slice(0, 10)} sel=${(c.input || "").slice(0, 10)} gas=${parseInt(c.gasUsed, 16)}${c.error ? " ERR=" + c.error : ""}`);
  let reason = "";
  if (tr.error) reason = tr.output && tr.output !== "0x" ? decodeErr({ data: tr.output }) : tr.error;
  return { frames, reason };
}

// 정책 바이트. pcl-template-okrw-eas-transfer-limit-policy, pcl-template-okrw-eas-periodic-volume-limit-policy 의 struct 순서 그대로.
const transferLimit = coder.encode(["tuple(address,address,bytes32,uint256)"], [[EAS, INDEXER, SCHEMA_UID, SINGLE_LIMIT]]);
const periodicLimit = coder.encode(["tuple(address,address,bytes32,uint256,uint64)"], [[EAS, INDEXER, SCHEMA_UID, PERIOD_MAX, PERIOD_SEC]]);
// 문서 예제(managing-contract-policies, tutorial 5단계)는 모두 selector "0x". 그대로 쓴다.
const policies = [
  { templateId: "OKRW_EAS_TRANSFER_LIMIT_POLICY", policy: transferLimit, selector: "0x" },
  { templateId: "OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY", policy: periodicLimit, selector: "0x" },
];

console.log(`# 문서대로 따라 하기: 급여 한도 정책 (테스트넷)  date: ${new Date().toISOString().slice(0, 10)}${DRY ? "  (dry run)" : ""}`);
console.log(`pay(address) selector ${payIface.getFunction("pay").selector}, version() selector ${payIface.getFunction("version").selector}`);
console.log(`OKRW_EAS_TRANSFER_LIMIT_POLICY bytes: ${transferLimit}`);
console.log(`OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY bytes: ${periodicLimit}`);
if (DRY) { console.log("Payout bytecode bytes:", (payout.bytecode.length - 2) / 2); process.exit(0); }
if (!process.env.MAROO_PRIVATE_KEY) { console.error("MAROO_PRIVATE_KEY가 없다"); process.exit(1); }

const owner = new ethers.Wallet(process.env.MAROO_PRIVATE_KEY, p);
const pcl = new ethers.Contract(PCL, iPclAbi, owner);
console.log(`owner(issuer, attestation 보유, 프록시 admin): ${owner.address}  잔고 ${okrw(await p.getBalance(owner.address))}`);
const ownerAttested = await new ethers.Contract(INDEXER, indexerIface, p).getReceivedAttestationUIDCount(owner.address, SCHEMA_UID);
console.log(`owner의 스키마 ${SCHEMA_UID.slice(0, 10)} 색인 수: ${ownerAttested}${ownerAttested === 0n ? "  (0이면 아래 결과가 전부 미인증 기준이 된다)" : ""}`);

let proxy = process.env.PAYOUT_PROXY, implAddr;
if (!proxy) {
  console.log("\nA. [contract-pcl-deploy-pcl-proxy] Transparent 프록시 배포");
  console.log("   문서 주장: initData = abi.encode(logic, initialOwner, initializer). 성공 시 PclProxyDeployed 발행, indexed 토픽 3개. admin은 msg.sender로 시딩.");
  const impl = await new ethers.ContractFactory(payout.abi, payout.bytecode, owner).deploy();
  await impl.waitForDeployment(); implAddr = await impl.getAddress();
  console.log(`   Payout 구현: ${implAddr}  tx ${impl.deploymentTransaction().hash}`);
  const initData = coder.encode(["address", "address", "bytes"], [implAddr, owner.address, "0x"]);
  const tx = await pcl.deployPclProxy(1, 0n, initData);
  const rc = await tx.wait();
  const log = rc.logs.find((l) => l.address.toLowerCase() === PCL.toLowerCase());
  const ev = pcl.interface.parseLog(log);
  proxy = ev.args.proxy;
  console.log(`   proxy: ${proxy}  kind=${ev.args.kind}  tx ${tx.hash}  gasUsed=${rc.gasUsed}  gasLimit=${tx.gasLimit}`);
  console.log(`   PclProxyDeployed 토픽 수: ${log.topics.length} (topic0 포함). indexed 인자 수 = ${log.topics.length - 1}. 문서는 3, IPcl.sol은 2(kind는 indexed 아님).`);
  const seeded = await pcl.contractPolicies(proxy);
  console.log(`   시딩된 admin: ${seeded.admin}  (${seeded.admin === owner.address ? "문서대로 배포자" : "문서와 다름"})  policies=${seeded.policies.length}`);
  console.log(`   pclProxy(proxy).kind=${(await pcl.pclProxy(proxy)).kind}`);

  console.log("\nB. [contract-pcl-proxy] UUPS 배포 시도");
  console.log("   문서 주장(contract-pcl-proxy): V1은 Transparent만 등록. 문서 주장(pcl-proxy-hook): Transparent와 UUPS 지원. initData = abi.encode(logic, initializer).");
  try {
    const tx2 = await pcl.deployPclProxy(2, 0n, coder.encode(["address", "bytes"], [implAddr, "0x"]));
    const rc2 = await tx2.wait();
    const ev2 = pcl.interface.parseLog(rc2.logs.find((l) => l.address.toLowerCase() === PCL.toLowerCase()));
    console.log(`   UUPS 성공: proxy ${ev2.args.proxy} kind=${ev2.args.kind}  tx ${tx2.hash}`);
  } catch (e) { console.log(`   UUPS 실패: ${decodeErr(e)}`); }
} else {
  console.log(`\nA, B 건너뜀. 기존 프록시 ${proxy}`);
}

console.log("\nC. [pcl-contract-admin-binding] 최초 바인딩은 누구든 가능하다는 주장. 프록시가 아닌 구현 주소에 임의 주소가 changeContractPolicies (eth_call)");
{
  const rnd = ethers.Wallet.createRandom().address;
  const target = implAddr ?? TO;
  await sim(`changeContractPolicies(${target.slice(0, 10)}..., admin=임의) from 임의 주소`, { from: rnd, to: PCL, data: pcl.interface.encodeFunctionData("changeContractPolicies", [{ _contract: target, admin: rnd, policies }]) });
}

if (!process.env.PAYOUT_PROXY) {
  console.log("\nD. [managing-contract-policies] read-then-write로 정책 바인딩, selector \"0x\"");
  console.log("   문서 주장: changeContractPolicies가 유일한 쓰기 경로이며 배열 전체를 교체한다. 성공 시 ContractPoliciesChanged 발행.");
  const current = await pcl.contractPolicies(proxy);
  const tx = await pcl.changeContractPolicies({ _contract: proxy, admin: current.admin, policies: [...current.policies, ...policies] });
  const rc = await tx.wait();
  console.log(`   tx ${tx.hash}  status=${rc.status}  gasUsed=${rc.gasUsed}  이벤트: ${rc.logs.map((l) => { try { return pcl.interface.parseLog(l)?.name; } catch { return l.topics[0].slice(0, 10); } }).join(",")}`);
}
const bound = await pcl.contractPolicies(proxy);
console.log(`   contractPolicies(proxy): admin=${bound.admin}  ${bound.policies.map((x) => `${x.templateId}@${x.selector}`).join(", ")}`);

console.log("\nE. [simulating-pcl-checks] from을 지정한 eth_call로 사전 검사");
console.log("   문서 주장: 프록시 대상 eth_call은 실제 tx와 같은 ReasonCode를 돌려준다. from을 빼면 엉뚱한 주체를 검사한다.");
const unatt = ethers.Wallet.createRandom().address;
console.log(`   미인증 임의 주소 ${unatt} (잔고는 state override, 문서에 없는 방법)`);
await sim("미인증 pay 5 tOKRW  (단건 한도 이하)", { from: unatt, to: proxy, data: PAY(TO), value: ethers.toQuantity(ethers.parseEther("5")) }, overrideFor(unatt));
await sim("미인증 pay 11 tOKRW (단건 한도 초과)", { from: unatt, to: proxy, data: PAY(TO), value: ethers.toQuantity(ethers.parseEther("11")) }, overrideFor(unatt));
console.log("     위 에러 이름을 문서와 대조: reason-codes는 ReachedLimitOfNonEAS, 템플릿 페이지는 ExceededAgentTransferLimit, post-call 페이지는 VolumeAboveMaxLimit");
await sim("인증   pay 11 tOKRW (면제)         ", { from: owner.address, to: proxy, data: PAY(TO), value: ethers.toQuantity(ethers.parseEther("11")) });
await sim("인증   pay 1 tOKRW                ", { from: owner.address, to: proxy, data: PAY(TO), value: ethers.toQuantity(ethers.parseEther("1")) });
await sim("from 생략 pay 1 tOKRW              ", { to: proxy, data: PAY(TO), value: ethers.toQuantity(ethers.parseEther("1")) });
console.log("   view 호출. 문서는 selector \"0x\"가 view에 미치는 영향을 말하지 않는다.");
await sim("미인증 version()                   ", { from: unatt, to: proxy, data: VERSION });
await sim("인증   version()                   ", { from: owner.address, to: proxy, data: VERSION });
await sim("from 생략 version()                ", { to: proxy, data: VERSION });
console.log("   에이전트/AA 없는 EOA 기준. 전역 정책(단건 200만 tOKRW)은 eth_call에서 평가되지 않음을 pcl-readonly-probe.txt 10번에서 확인했다.");

console.log("\nF. [tutorial-building-compliant-token 2단계, 7단계] attestation 발급 → 검사, revoke → EasAttestationRevoked");
console.log("   문서 주장: 2단계는 attest만 하면 된다(Indexer 색인 단계 없음). 7단계는 revoke 후 EasAttestationRevoked.");
{
  const eas = new ethers.Contract(EAS, easIface, owner);
  const indexer = new ethers.Contract(INDEXER, indexerIface, owner);
  const subject = ethers.Wallet.createRandom().address;
  const data = coder.encode(["bool"], [true]);
  const tx = await eas.attest({ schema: SCHEMA_UID, data: { recipient: subject, expirationTime: 0n, revocable: true, refUID: ethers.ZeroHash, data, value: 0n } });
  const rc = await tx.wait();
  const uid = rc.logs.map((l) => { try { return easIface.parseLog(l); } catch { return null; } }).find((x) => x?.name === "Attested").args.uid;
  console.log(`   attest → ${subject}  uid ${uid}  tx ${tx.hash}`);
  console.log(`   Indexer 색인 수(색인 전): ${await indexer.getReceivedAttestationUIDCount(subject, SCHEMA_UID)}`);
  await sim("색인 전  pay 11 tOKRW (문서대로면 면제)  ", { from: subject, to: proxy, data: PAY(TO), value: ethers.toQuantity(ethers.parseEther("11")) }, overrideFor(subject));
  const ti = await indexer.indexAttestation(uid); await ti.wait();
  console.log(`   indexAttestation tx ${ti.hash}  색인 수: ${await indexer.getReceivedAttestationUIDCount(subject, SCHEMA_UID)}`);
  await sim("색인 후  pay 11 tOKRW                 ", { from: subject, to: proxy, data: PAY(TO), value: ethers.toQuantity(ethers.parseEther("11")) }, overrideFor(subject));
  const tr = await eas.revoke({ schema: SCHEMA_UID, data: { uid, value: 0n } }); await tr.wait();
  console.log(`   revoke tx ${tr.hash}`);
  await sim("revoke 후 pay 11 tOKRW (문서: EasAttestationRevoked)", { from: subject, to: proxy, data: PAY(TO), value: ethers.toQuantity(ethers.parseEther("11")) }, overrideFor(subject));
  await sim("revoke 후 pay 5 tOKRW  (한도 이하)     ", { from: subject, to: proxy, data: PAY(TO), value: ethers.toQuantity(ethers.parseEther("5")) }, overrideFor(subject));
}

console.log("\nG. 실제 tx: 인증 지갑이 pay 1 tOKRW. 가스 한도는 라이브러리 estimateGas에 맡긴다(문서 튜토리얼과 같다).");
{
  const before = await p.getBalance(TO);
  const tx = await owner.sendTransaction({ to: proxy, data: PAY(TO), value: ethers.parseEther("1") });
  const rc = await tx.wait();
  const paid = rc.logs.map((l) => { try { return payIface.parseLog(l); } catch { return null; } }).find((x) => x?.name === "Paid");
  console.log(`   tx ${tx.hash}  status=${rc.status}  gasUsed=${rc.gasUsed}  gasLimit=${tx.gasLimit}  gasUsed/gasLimit=${(Number(rc.gasUsed * 1000n / tx.gasLimit) / 1000).toFixed(3)}  Paid=${paid ? J(paid.args) : "없음"}`);
  console.log(`   수취인 잔고 ${okrw(before)} → ${okrw(await p.getBalance(TO))}`);
  const { frames } = await traceSummary(tx.hash);
  frames.forEach((f) => console.log(`   frame ${f}`));
  console.log(`   인증 지갑 누적 contractOkrwEasPeriodicVolume(proxy, owner, "0x"): ${J(await pcl.contractOkrwEasPeriodicVolume(proxy, owner.address, "0x"))}  (문서: 인증 발신자는 누적하지 않음)`);
}

if (process.env.KYC_USER_KEY) {
  const user = new ethers.Wallet(process.env.KYC_USER_KEY, p);
  const bal = await p.getBalance(user.address);
  console.log(`\nH. 실제 tx: 미인증 지갑 ${user.address} 잔고 ${okrw(bal)}`);
  if (bal < ethers.parseEther("30")) console.log("   잔고 30 tOKRW 미만이라 건너뛴다");
  else {
    const send = async (label, amount) => {
      let hash;
      try {
        const tx = await user.sendTransaction({ to: proxy, data: PAY(TO), value: amount, gasLimit: 900_000n });
        hash = tx.hash;
        const rc = await tx.wait().catch((e) => e.receipt);
        const { reason } = rc.status === 0 ? await traceSummary(hash) : { reason: "" };
        console.log(`   ${label}: tx ${hash} status=${rc.status} gasUsed=${rc.gasUsed} ${reason}`);
      } catch (e) { console.log(`   ${label}: 전송 실패 ${decodeErr(e)}`); }
      console.log(`      누적 contractOkrwEasPeriodicVolume: ${J(await pcl.contractOkrwEasPeriodicVolume(proxy, user.address, "0x"))}`);
    };
    await send("pay 11 tOKRW (단건 초과, 문서: 거절)", ethers.parseEther("11"));
    await send("pay 10 tOKRW (문서: 통과)", ethers.parseEther("10"));
    await send("pay 10 tOKRW (문서: 통과, 누적 20)", ethers.parseEther("10"));
    await send("pay 6 tOKRW (누적 26 > 25, 문서: ExceededPeriodicVolume)", ethers.parseEther("6"));
  }
} else {
  console.log("\nH. 건너뜀. KYC_USER_KEY가 없다. 미인증 지갑의 실제 거절 tx와 누적 카운터 변화는 시뮬레이션(E)으로만 확인했다.");
}
console.log("\n끝. PAYOUT_PROXY=" + proxy + " 로 재실행하면 A, B, D를 건너뛴다.");
