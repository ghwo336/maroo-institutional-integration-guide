// 이전 실습(2026-08-22)에서 같은 프록시에 보낸 실제 트랜잭션 4건의 영수증과 callTracer 결과.
// 개인키 불필요. 실행: node pcl-tx-trace.mjs
import { ethers } from "ethers";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { iPclAbi } = require("@maroo-chain/contracts/abi/precompiles/pcl/IPcl");

const p = new ethers.JsonRpcProvider("https://rpc-testnet.maroo.io");
const errIface = new ethers.Interface(iPclAbi.filter((x) => x.type === "error"));
const SEL = { "0x43d1bbb2": "preCall", "0xe4fd3acd": "postCall", "0xa9059cbb": "transfer" };
const NAME = { "0x5bcec33cf3f6496daf27956fd4c4f157ca0342e3": "proxy", "0x805f34f3fa7211a491bd62a0468b23c786b7aa17": "impl", "0x1000000000000000000000000000000000000005": "PCL" };
const TXS = [
  ["0x3e696cd403788ede0af895c12a13d188fef5fdda34dc2e3ea36ef9c594d446dd", "attestation 색인 전, gasLimit 500,000"],
  ["0xec5c27b7a9c217cfcae2c42116975c4e7993392807a779aa7e8774b1789d771a", "attestation 색인 후, gasLimit 500,000"],
  ["0x18dfa4d21f834a5da5ac3a79103eb86361c1df497fe1ba9bfd5dcccc3401d045", "attestation 색인 후, gasLimit 500,000 (재시도)"],
  ["0xc2dd4f31efbbe67648ee1ab3b2c0fa667bfd9240d967f4e5c49b57c3f186944c", "attestation 색인 후, gasLimit 1,500,000"],
];
console.log(`# PCL 프록시 실제 tx 추적  date: ${new Date().toISOString().slice(0, 10)}  (tx 실행일 2026-08-22)`);
for (const [h, note] of TXS) {
  const tx = await p.getTransaction(h), rc = await p.getTransactionReceipt(h);
  console.log(`\n## ${h}\n   ${note}`);
  console.log(`   status=${rc.status} gasUsed=${rc.gasUsed} gasLimit=${tx.gasLimit} gasUsed/gasLimit=${(Number(rc.gasUsed * 1000n / tx.gasLimit) / 1000).toFixed(3)} logs=${rc.logs.length} block=${rc.blockNumber}`);
  const tr = await p.send("debug_traceTransaction", [h, { tracer: "callTracer" }]);
  const walk = (n, d) => {
    let err = "";
    if (n.error) { err = ` ERR=${n.error}`; if (n.output && n.output !== "0x") { try { const e = errIface.parseError(n.output); err += ` ${e.name}(${e.args.join(", ")})`; } catch { err += ` output=${n.output.slice(0, 10)}`; } } }
    console.log(`   ${"  ".repeat(d)}${n.type} ${NAME[n.to] ?? n.to} ${SEL[(n.input || "").slice(0, 10)] ?? (n.input || "").slice(0, 10)} gasUsed=${parseInt(n.gasUsed, 16)}${err}`);
    (n.calls || []).forEach((c) => walk(c, d + 1));
  };
  walk(tr, 0);
}
console.log("\n## gasUsed가 gasLimit의 정확히 절반으로 기록되는 현상: 익스플로러 최근 검증 tx 표본");
const r = await fetch("https://explorer-testnet.maroo.io/blockscout/api/v2/transactions?filter=validated").then((r) => r.json());
let half = 0; const items = r.items ?? [];
for (const t of items) if (BigInt(t.gas_used) * 2n === BigInt(t.gas_limit)) { half++; console.log(`   ${t.hash} used=${t.gas_used} limit=${t.gas_limit}`); }
console.log(`   표본 ${items.length}건 중 정확히 절반 ${half}건`);
