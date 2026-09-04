// 4.2 정책 설정: 급여 컨트랙트 배포 → PCL 프록시 배포 → 규칙 두 개를 pay selector에 바인딩.
// 실행: node setup-payroll-policy.mjs --dry                     (인코딩만 출력, 개인키 불필요)
//       MAROO_PRIVATE_KEY=0x... node setup-payroll-policy.mjs   (테스트넷에 실제 배포)
//       PAYOUT_PROXY=0x... 를 주면 배포를 건너뛰고 바인딩만 다시 한다.
import { ethers } from "ethers";
import { createRequire } from "module";
import { readFileSync } from "fs";
const require = createRequire(import.meta.url);
const { iPclAbi } = require("@maroo-chain/contracts/abi/precompiles/pcl/IPcl");
const { iEasAbi } = require("@maroo-chain/contracts/abi/precompiles/eas/IEas");
const payout = JSON.parse(readFileSync(new URL("./Payout.json", import.meta.url)));

const DRY = process.argv.includes("--dry");
const RPC = process.env.MAROO_RPC ?? "https://rpc-testnet.maroo.io";
const PCL = "0x1000000000000000000000000000000000000005";
const IEAS = "0x1000000000000000000000000000000000000009";
const KYC_SCHEMA_UID = process.env.KYC_SCHEMA_UID ?? "0xc74ecef5301b91fbff53451f7e66cafd41871e4f02e3c38766b9d8139f641a63"; // 은행 KYC 스키마
const SINGLE_LIMIT = ethers.parseEther(process.env.SINGLE_LIMIT ?? "10"); // attestation 없는 지갑의 단건 상한
const PERIOD_MAX = ethers.parseEther(process.env.PERIOD_MAX ?? "25");     // attestation 없는 지갑의 24시간 누적 상한

const p = new ethers.JsonRpcProvider(RPC);
const coder = ethers.AbiCoder.defaultAbiCoder();
const paySelector = new ethers.Interface(payout.abi).getFunction("pay").selector;

// easContract, indexContract는 하드코딩하지 않고 IEas getParams에서 읽는다
const { eas, indexer } = await new ethers.Contract(IEAS, iEasAbi, p).getParams();

// 규칙 두 개. 파라미터 순서는 IPcl.sol 템플릿 정의 그대로
const policies = [
  { templateId: "OKRW_EAS_TRANSFER_LIMIT_POLICY",
    policy: coder.encode(["tuple(address,address,bytes32,uint256)"], [[eas, indexer, KYC_SCHEMA_UID, SINGLE_LIMIT]]),
    selector: paySelector },
  { templateId: "OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY",
    policy: coder.encode(["tuple(address,address,bytes32,uint256,uint64)"], [[eas, indexer, KYC_SCHEMA_UID, PERIOD_MAX, 86400n]]),
    selector: paySelector },
];

console.log(`rpc: ${RPC}  chainId: ${(await p.getNetwork()).chainId}${DRY ? "  (dry run)" : ""}`);
console.log(`eas: ${eas}  indexer: ${indexer}  schema: ${KYC_SCHEMA_UID}`);
console.log(`pay(address) selector: ${paySelector}`);
for (const x of policies) console.log(`${x.templateId}: ${x.policy}`);
if (DRY) process.exit(0);
if (!process.env.MAROO_PRIVATE_KEY) { console.error("MAROO_PRIVATE_KEY가 없다. --dry로 인코딩만 볼 수 있다."); process.exit(1); }

const bank = new ethers.Wallet(process.env.MAROO_PRIVATE_KEY, p);
const pcl = new ethers.Contract(PCL, iPclAbi, bank);
console.log(`bank(admin): ${bank.address}  잔고 ${ethers.formatEther(await p.getBalance(bank.address))} tOKRW\n`);

let proxy = process.env.PAYOUT_PROXY;
if (!proxy) {
  console.log("1. 급여 컨트랙트 배포");
  const impl = await new ethers.ContractFactory(payout.abi, payout.bytecode, bank).deploy();
  await impl.waitForDeployment();
  console.log(`  Payout: ${await impl.getAddress()}  tx ${impl.deploymentTransaction().hash}`);

  console.log("2. PCL 프록시 배포. initData = abi.encode(logic, initialOwner, initializerCalldata)");
  const initData = coder.encode(["address", "address", "bytes"], [await impl.getAddress(), bank.address, "0x"]);
  const rc = await (await pcl.deployPclProxy(1, 0n, initData)).wait(); // kind 1 = Transparent
  proxy = pcl.interface.parseLog(rc.logs.find((l) => l.address.toLowerCase() === PCL.toLowerCase())).args.proxy;
  console.log(`  proxy: ${proxy}  tx ${rc.hash}  gasUsed ${rc.gasUsed}`);
} else {
  console.log(`1, 2. 건너뜀. PAYOUT_PROXY=${proxy}`);
}

console.log("3. 규칙 두 개를 pay selector에 바인딩. 배열 전체가 교체된다");
const rc = await (await pcl.changeContractPolicies({ _contract: proxy, admin: bank.address, policies })).wait();
const bound = await pcl.contractPolicies(proxy);
console.log(`  tx ${rc.hash}  status ${rc.status}  gasUsed ${rc.gasUsed}`);
console.log(`  contractPolicies(proxy): ${bound.policies.map((x) => `${x.templateId}@${x.selector}`).join(", ")}`);
console.log(`\n완료. 기업에 알릴 주소는 ${proxy} 다. 확인은 PROXY=${proxy} FROM=<지갑> CALL=pay VALUE=1 node simulate.mjs`);
