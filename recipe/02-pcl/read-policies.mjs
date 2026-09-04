// 4.2 정책 설정: 테스트넷 PCL 읽기. 개인키 불필요.
// 실행: node read-policies.mjs [주소]   (주소를 주면 그 주소의 남은 전역 누적 한도를 같이 읽는다)
import { ethers } from "ethers";
import { createRequire } from "module";
const { iPclAbi } = createRequire(import.meta.url)("@maroo-chain/contracts/abi/precompiles/pcl/IPcl");

const RPC = process.env.MAROO_RPC ?? "https://rpc-testnet.maroo.io";
const PCL = "0x1000000000000000000000000000000000000005";
const PRIVACY = "0x100000000000000000000000000000000000000b";
const ADDR = process.argv[2] ?? "0x552B9F6BA65DE19D93F568DEF894d5Efdc1E6866";

const p = new ethers.JsonRpcProvider(RPC);
const pcl = new ethers.Contract(PCL, iPclAbi, p);
const coder = ethers.AbiCoder.defaultAbiCoder();
const okrw = (x) => `${ethers.formatEther(x)} tOKRW`;

// 정책 바이트 디코더. struct 순서는 IPcl.sol 템플릿 정의 그대로
const PS = "tuple(string templateId, bytes policy, bytes selector)";
const shape = {
  EAS_POLICY: "tuple(address eas, address indexer, bytes32 schemaUid)",
  DENYLIST_POLICY: "tuple(address[] addresses)",
  VOLUME_POLICY: "tuple(string[] tokens, tuple(uint256 minLimit, uint256 maxLimit)[] limits)",
  PERIODIC_VOLUME_POLICY: "tuple(string[] tokens, tuple(uint256 maxAmount, uint64 resetPeriodSeconds)[] limits)",
  OKRW_EAS_TRANSFER_LIMIT_POLICY: "tuple(address eas, address indexer, bytes32 schemaUid, uint256 transferLimitAmount)",
  OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY: "tuple(address eas, address indexer, bytes32 schemaUid, uint256 maxAmount, uint64 resetPeriodSeconds)",
  LOGICAL_POLICY: `tuple(uint8 quantifier, ${PS}[] children)`,
  FOR_EACH_POLICY: `tuple(uint8 quantifier, uint8 subject, ${PS} child)`,
};
function show(ps, depth = 1) {
  const ind = "  ".repeat(depth), sel = ps.selector === "0x" ? "모든 호출" : ps.selector;
  if (!shape[ps.templateId]) return console.log(`${ind}${ps.templateId} selector=${sel}`);
  const [d] = coder.decode([shape[ps.templateId]], ps.policy);
  switch (ps.templateId) {
    case "LOGICAL_POLICY": console.log(`${ind}${["", "AND", "OR"][d.quantifier]}`); return d.children.forEach((c) => show(c, depth + 1));
    case "FOR_EACH_POLICY": console.log(`${ind}FOR_EACH ${["", "Any", "Every"][d.quantifier]} AgentOwners`); return show(d.child, depth + 1);
    case "VOLUME_POLICY": return console.log(`${ind}단건 ${d.tokens} max ${okrw(d.limits[0].maxLimit)} (selector=${sel})`);
    case "PERIODIC_VOLUME_POLICY": return console.log(`${ind}누적 ${d.tokens} max ${okrw(d.limits[0].maxAmount)} / ${d.limits[0].resetPeriodSeconds}s (selector=${sel})`);
    case "EAS_POLICY": return console.log(`${ind}attestation 스키마 ${d.schemaUid} (selector=${sel})`);
    default: return console.log(`${ind}${ps.templateId} ${JSON.stringify(d, (k, v) => (typeof v === "bigint" ? v.toString() : v))} (selector=${sel})`);
  }
}

console.log(`rpc: ${RPC}  chainId: ${(await p.getNetwork()).chainId}  block: ${await p.getBlockNumber()}\n`);

console.log("1. 등록된 템플릿");
for (const id of [...Object.keys(shape), "AGENT_OKRW_TRANSFER_LIMIT_POLICY"]) console.log(`  ${id}: ${(await pcl.policyTemplate(id)).name}`);

console.log("\n2. 전역 정책. 모든 트랜잭션에 AnteHandler가 적용한다");
(await pcl.globalPolicies()).policies.forEach((ps, i) => { console.log(`  [${i}]`); show(ps, 2); });

console.log("\n3. Privacy 프리컴파일 주소에 붙은 컨트랙트 정책. admin이 마루 policyAdmin이라 은행은 못 바꾼다");
const priv = await pcl.contractPolicies(PRIVACY);
console.log(`  admin: ${priv.admin} (policyAdmin: ${await pcl.policyAdmin()})`); priv.policies.forEach((ps) => show(ps, 2));

console.log(`\n4. ${ADDR}의 남은 전역 누적 한도`);
const v = await pcl.globalPeriodicVolume(ADDR, "atokrw", 86400, false);
console.log(v.length ? v.map((s) => `  사용 ${okrw(s.amount)} / max ${okrw(s.maxAmount)}, 리셋 ${new Date(Number(s.resetAt) * 1000).toISOString()}`).join("\n") : "  (기록 없음)");
