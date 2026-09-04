#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out");
const binary = process.env.CLAIRVEILD ?? "clairveild";
const home = process.env.CLAIRVEIL_HOME ?? `${process.env.HOME}/.clairveil`;
const node = process.env.NODE ?? "tcp://localhost:26657";
const chainId = process.env.CHAIN_ID ?? "clairveil-local-1";
const gasPrices = process.env.GAS_PRICES ?? "8500000000uclair";
const denom = process.env.DENOM ?? "uclair";
const depositAmount = Number(process.env.DEPOSIT_AMOUNT ?? "20");
const employees = (process.env.EMPLOYEES ?? "bob carol dave").split(/\s+/);
const salaries = (process.env.SALARIES ?? "4 5 6").split(/\s+/).map(Number);
const requestedStep = process.argv[2] ?? "all";

mkdirSync(out, { recursive: true });

function command(args: string[], captureJson = true): any {
  const stdout = execFileSync(binary, [...args, "--home", home], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
  return captureJson ? JSON.parse(stdout) : stdout.trim();
}

function save(name: string, value: unknown): void {
  writeFileSync(join(out, name), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function load(name: string): any {
  return JSON.parse(readFileSync(join(out, name), "utf8"));
}

function hash(response: any): string {
  return response.txhash ?? response.tx_response?.txhash;
}

function waitForTx(txHash: string): any {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      // 블록에 실리기 전에는 tx not found가 나오므로 그 사이의 CLI 에러 출력은 버린다
      const stdout = execFileSync(binary, ["query", "tx", txHash, "--node", node, "--output", "json", "--home", home], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      return JSON.parse(stdout);
    } catch {
      execFileSync("sleep", ["1"]);
    }
  }
  throw new Error(`tx 조회 시간 초과: ${txHash}`);
}

function ensureKey(name: string): void {
  try {
    command(["keys", "show", name, "--keyring-backend", "test"], false);
  } catch {
    command(["keys", "add", name, "--keyring-backend", "test", "--output", "json"]);
  }
}

function shieldedAddress(name: string): string {
  return command([
    "tx", "privacy", "show-address", "--from", name,
    "--keyring-backend", "test", "--output", "json",
  ]).address;
}

function step1(): void {
  console.log("1. 기업 deposit");
  const before = command([
    "tx", "privacy", "list-notes", "--from", "alice", "--keyring-backend", "test",
    "--node", node, "--rescan-wallet", "--json",
  ]);
  const response = command([
    "tx", "privacy", "deposit", `${depositAmount}${denom}`,
    "--from", "alice", "--keyring-backend", "test", "--chain-id", chainId,
    "--node", node, "--gas", "2500000", "--gas-prices", gasPrices,
    "--yes", "--output", "json",
  ]);
  const receipt = waitForTx(hash(response));
  if (Number(receipt.code) !== 0) throw new Error(receipt.raw_log);
  const after = command([
    "tx", "privacy", "list-notes", "--from", "alice", "--keyring-backend", "test",
    "--node", node, "--rescan-wallet", "--json",
  ]);
  const txHash = hash(response).toLowerCase();
  const note = after.notes.find((item: any) => item.tx_hash === txHash);
  if (!note || Number(note.amount) !== depositAmount) throw new Error("deposit 노트를 찾지 못했다");
  save("ts-1-before.json", before);
  save("ts-1-deposit.json", response);
  save("ts-1-receipt.json", receipt);
  save("ts-state.json", { depositTxHash: hash(response), inputIndex: note.index });
  console.log(`   tx ${hash(response)}, gas ${receipt.gas_used}, note index ${note.index}`);
}

function step2(): void {
  console.log("2. 비공개 일괄 지급");
  if (employees.length < 3 || employees.length !== salaries.length) {
    throw new Error("직원은 3명 이상이며 EMPLOYEES와 SALARIES 길이가 같아야 한다");
  }
  const total = salaries.reduce((sum, amount) => sum + amount, 0);
  if (depositAmount <= total) throw new Error("거스름돈을 만들려면 예치액이 급여 합계보다 커야 한다");
  const state = load("ts-state.json");
  const payments: string[] = [];
  employees.forEach((name, index) => {
    ensureKey(name);
    const address = shieldedAddress(name);
    if (name === "bob") {
      const disclosure = command([
        "tx", "privacy", "show-disclosure-pubkey", "--from", "bob",
        "--keyring-backend", "test", "--output", "json",
      ]).public_key_hex;
      payments.push("--payment", `${address},${salaries[index]}${denom},amount-from-to,recipient-encrypted,${disclosure}`);
    } else {
      payments.push("--payment", `${address},${salaries[index]}${denom}`);
    }
  });
  const prepared = join(out, "ts-2-prepared.json");
  const proof = join(out, "ts-2-proof.json");
  const response = command([
    "tx", "privacy", "transfer-batch-16x32", ...payments,
    "--input-index", String(state.inputIndex), "--output-mode", "compact",
    "--prepared-out", prepared, "--proof-out", proof, "--rescan-wallet",
    "--from", "alice", "--keyring-backend", "test", "--chain-id", chainId,
    "--node", node, "--gas", "80000000", "--gas-prices", gasPrices,
    "--yes", "--output", "json",
  ]);
  chmodSync(prepared, 0o600);
  chmodSync(proof, 0o600);
  const receipt = waitForTx(hash(response));
  if (Number(receipt.code) !== 0) throw new Error(receipt.raw_log);
  save("ts-2-batch.json", response);
  save("ts-2-receipt.json", receipt);
  save("ts-state.json", { ...state, batchTxHash: hash(response) });
  console.log(`   tx ${hash(response)}, gas ${receipt.gas_used}, MsgBatchTransfer 1개`);
}

function step3(): void {
  console.log("3. 직원 노트 스캔");
  const notes = command([
    "tx", "privacy", "list-notes", "--from", "bob", "--keyring-backend", "test",
    "--node", node, "--rescan-wallet", "--json",
  ]);
  const state = load("ts-state.json");
  const note = notes.notes.find((item: any) => item.tx_hash === state.batchTxHash.toLowerCase());
  if (!note) throw new Error("bob의 급여 노트를 찾지 못했다");
  save("ts-3-bob-notes.json", notes);
  console.log(`   bob ${note.amount}${denom}, ${note.status}`);
}

function step4(): void {
  console.log("4. relayer 출금");
  const recipient = command(["keys", "show", "bob", "--keyring-backend", "test", "-a"], false);
  const payload = join(out, "ts-4-withdraw-payload.json");
  const prepared = command([
    "tx", "privacy", "prepare-withdraw", `${process.env.WITHDRAW_AMOUNT ?? "4"}${denom}`,
    "--recipient", recipient, "--from", "bob", "--keyring-backend", "test",
    "--node", node, "--chain-id", chainId, "--out", payload, "--output", "json",
  ]);
  chmodSync(payload, 0o600);
  const response = command([
    "tx", "privacy", "relay-withdraw", payload, "--from", "relayer",
    "--keyring-backend", "test", "--node", node, "--chain-id", chainId,
    "--gas", "3500000", "--gas-prices", gasPrices, "--yes", "--output", "json",
  ]);
  const receipt = waitForTx(hash(response));
  if (Number(receipt.code) !== 0) throw new Error(receipt.raw_log);
  save("ts-4-prepare.json", prepared);
  save("ts-4-relay.json", response);
  save("ts-4-receipt.json", receipt);
  console.log(`   tx ${hash(response)}, gas ${receipt.gas_used}, submitter relayer`);
}

function decodePlane(hex: string, plane: string, key: string): any {
  // 실패가 예상되는 호출(출력 1 이상)이 있어 CLI usage 출력은 버린다
  const stdout = execFileSync(binary, [
    "tx", "privacy", "decode-transfer-disclosure", hex, "--disclosure-plane", plane,
    "--from", key, "--keyring-backend", "test", "--node", node, "--report", "--home", home,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(stdout);
}

// 배치 tx의 출력마다 붙은 암호화 사본을 세 키로 복호화한다. 감사자(audit), 기업(self-view), 직원 bob(recipient).
// v0.4.0의 decode-transfer-disclosure는 --tx-hash로는 단일 MsgTransfer만 찾지만, ciphertext hex를 직접 주면 배치 출력도 읽는다.
function decodeOutputs(plane: string, key: string, field: string): any[] {
  const receipt = load("ts-2-receipt.json");
  const outputs: any[] = (receipt.tx ?? receipt.tx_response.tx).body.messages[0].outputs;
  return outputs.map((output, index) => {
    if (!output[field]) return { output_index: index, plane, status: "NotPresent" };
    try {
      const report = decodePlane(Buffer.from(output[field], "base64").toString("hex"), plane, key);
      return {
        output_index: index, plane, status: report.verification?.verified ? "Verified" : "Unverified",
        amount: report.summary?.amount, sender: report.summary?.from_shielded_address,
        recipient: report.summary?.to_shielded_address, policy: report.summary?.policy,
      };
    } catch (error: any) {
      // v0.4.0 decode-transfer-disclosure는 output_index 0의 digest만 재계산한다. 1 이상은 CLI로 검증할 수 없다.
      const status = index > 0 ? "CliUnsupported" : "DecryptFailed";
      return { output_index: index, plane, status, error: index > 0 ? "v0.4.0 CLI는 output_index 0만 지원" : String(error?.message ?? error).slice(0, 160) };
    }
  });
}

function step5(): void {
  console.log("5. 감사와 기업 대사");
  const txHash = load("ts-state.json").batchTxHash;
  const audit = decodeOutputs("audit", "auditor", "audit_disclosure_payload");
  const selfView = decodeOutputs("self-view", "alice", "self_view_disclosure_payload");
  const recipient = decodeOutputs("recipient", "bob", "user_disclosure_payload");
  save("ts-5-audit-report.json", { tx_hash: txHash, key: "auditor", outputs: audit });
  save("ts-6-self-view-report.json", { tx_hash: txHash, key: "alice", outputs: selfView });
  save("ts-6-recipient-report.json", { tx_hash: txHash, key: "bob", outputs: recipient });
  const line = (rows: any[]) => rows.map((r) => `${r.status}${r.amount ? ` ${r.amount}${denom}` : ""}`).join(", ");
  console.log(`   감사자 audit 사본: ${line(audit)}`);
  console.log(`   기업 self-view 사본: ${line(selfView)}`);
  console.log(`   직원 bob recipient 사본: ${line(recipient)}`);
  const first = [audit[0], selfView[0], recipient[0]];
  if (first.some((r) => r.status !== "Verified")) throw new Error("출력 0의 세 사본 중 복호화되지 않은 것이 있다");
  if (new Set(first.map((r) => `${r.amount}|${r.sender}|${r.recipient}`)).size !== 1) throw new Error("출력 0의 감사, self-view, recipient 복호화 결과가 서로 다르다");
  if (Number(first[0].amount) !== salaries[0]) throw new Error(`출력 0 금액 ${first[0].amount} 이 급여 대장 ${salaries[0]} 과 다르다`);
  console.log(`   출력 0: 세 키 모두 같은 송신자, 수신자, 금액 ${first[0].amount}${denom} 복원. 급여 대장과 일치`);
  console.log("   출력 1 이상: v0.4.0 CLI가 digest를 재계산하지 못해 검증 불가. 네 출력 전부의 복호화 결과는 evidence/local-privacy/evidence/recipe-5, recipe-6 JSON 참조");
}

const steps: Record<string, () => void> = { "1": step1, "2": step2, "3": step3, "4": step4, "5": step5 };
if (requestedStep === "all") Object.values(steps).forEach((run) => run());
else if (steps[requestedStep]) steps[requestedStep]();
else throw new Error("사용법: node privacy-payroll.ts [1|2|3|4|5|all]");
