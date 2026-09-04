// 급여 한도 템플릿 두 개의 초과 에러 이름을 개인키 없이 실측한다.
// 테스트넷에 다른 배포자가 OKRW_EAS_TRANSFER_LIMIT_POLICY와 OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY를
// 잠깐 바인딩했던 프록시가 있다(PCL 프리컴파일의 ContractPoliciesChanged 로그, 2026-09-03 17:43 UTC 무렵).
// 그 블록 높이를 지정한 eth_call은 그 시점의 정책으로 평가되므로, 잔고 state override를 준 미인증 주소로
// 한도 아래와 위 금액을 보내 revert data를 읽는다. 문서 세 페이지가 서로 다른 이름을 쓰는 것을 실제 응답으로 확정한다.
//
//   node limit-error-probe.mjs > evidence/limit-error-probe.txt
import { ethers } from "ethers";
import { createRequire } from "module";
const { iPclAbi } = createRequire(import.meta.url)("@maroo-chain/contracts/abi/precompiles/pcl/IPcl");

const RPC = process.env.MAROO_RPC ?? "https://rpc-testnet.maroo.io";
const PCL = "0x1000000000000000000000000000000000000005";
const PROXY = "0x65Ba55397D329D39A632F789d5A2C3E87c6dB88e"; // 로그에서 고른 프록시. 다른 다섯 개도 같은 순서로 바인딩됐다
// 블록별 바인딩(ContractPoliciesChanged): 17217688 OKRW_EAS_TRANSFER_LIMIT_POLICY(단건 1,000 tOKRW),
// 17217690 OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY(24h 10,000 tOKRW). selector는 둘 다 0x(모든 호출).
const CASES = [
  { block: 17217688, template: "OKRW_EAS_TRANSFER_LIMIT_POLICY", values: ["999", "1001"] },
  { block: 17217690, template: "OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY", values: ["9999", "10001"] },
];

const p = new ethers.JsonRpcProvider(RPC);
const pcl = new ethers.Contract(PCL, iPclAbi, p);
const errors = new ethers.Interface([...iPclAbi.filter((x) => x.type === "error"), "error Error(string)"]);
const stranger = ethers.Wallet.createRandom().address; // attestation 없음
const override = { [stranger]: { balance: ethers.toQuantity(ethers.parseEther("100000")) } };
const decode = (raw) => { try { const d = errors.parseError(raw); return `${d.name}(${d.args.join(", ")})`; } catch { return raw && raw !== "0x" ? `미확인 ${String(raw).slice(0, 10)}` : "revert data 없음"; } };

console.log(`# 한도 초과 에러 이름 실측 (과거 블록 eth_call)  date: ${new Date().toISOString().slice(0, 10)}  rpc: ${RPC}`);
console.log(`proxy: ${PROXY}  미인증 임의 주소: ${stranger} (잔고는 state override)`);
console.log(`latest block: ${await p.getBlockNumber()}\n`);

for (const c of CASES) {
  const blk = ethers.toQuantity(c.block);
  const ts = new Date((await p.getBlock(c.block)).timestamp * 1000).toISOString();
  const bound = await pcl.contractPolicies(PROXY, { blockTag: c.block });
  console.log(`## block ${c.block} (${ts})`);
  console.log(`   contractPolicies(proxy): ${bound.policies.map((x) => `${x.templateId}@${x.selector}`).join(", ")}  (기대: ${c.template})`);
  for (const v of c.values) {
    const tx = { from: stranger, to: PROXY, data: "0x", value: ethers.toQuantity(ethers.parseEther(v)) };
    let line;
    try { await p.send("eth_call", [tx, blk, override]); line = "OK"; }
    catch (e) { line = `REVERT ${decode(e?.data ?? e?.info?.error?.data ?? e?.error?.data)}`; }
    // callTracer로 어느 프레임이 되돌렸는지 본다. preCall selector 0x43d1bbb2, postCall 0xe4fd3acd
    let frames = "";
    try {
      const tr = await p.send("debug_traceCall", [tx, blk, { tracer: "callTracer", stateOverrides: override }]);
      frames = (tr.calls ?? []).map((f) => `${f.type} ${f.to.toLowerCase() === PCL ? "PCL" : f.to.slice(0, 10)} sel=${(f.input || "").slice(0, 10)}${f.error ? " ERR=" + f.error : ""}`).join(" | ");
    } catch (e) { frames = `trace 실패: ${e.shortMessage ?? e.message}`; }
    console.log(`   미인증 value ${v} tOKRW: ${line}`);
    console.log(`      frames: ${frames}`);
  }
  console.log();
}
console.log("읽는 법: 한도 아래 금액이 revert data 없이 되돌려지는 것은 preCall을 지난 뒤 구현 컨트랙트가 빈 calldata를 받지 않아서다(delegatecall 프레임에 ERR).");
console.log("한도 위 금액은 preCall 프레임에서 되돌려지고 revert data에 IPcl 커스텀 에러가 실린다. 전역 정책은 eth_call이 평가하지 않으므로 여기 값은 컨트랙트 정책만의 결과다.");
