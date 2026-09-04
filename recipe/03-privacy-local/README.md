# 03 privacy local: 비공개 급여 지급

Clairveil에는 PCL과 OKRW가 없다. 이 예제는 Privacy 흐름만 재현한다. 마루 테스트넷 Privacy 프리컴파일은 증명 재료가 공개되지 않아 이 흐름을 테스트넷에서 완주할 수 없다. 기준일은 2026년 9월 2일이다.

기업 `alice`가 직원 `bob`, `carol`, `dave`에게 급여를 지급한다. 한 개의 입력 노트로 직원 노트 세 개와 거스름돈 노트 한 개를 만든다. `MsgBatchTransfer` 한 건에 `BatchJoinSplit16x32` 증명 한 개가 들어간다.

## 사전 요구 사항

Clairveil commit `ca85b02708fdd75259d4d2ee2d671c21198cec69`, tag `v0.4.0`을 사용한다. Go 1.26.4에서 실행을 확인했다.

아래 명령은 전부 이 리포의 루트에서 실행한다. `CLAIRVEIL_SRC`는 Clairveil 소스를 둘 위치이며 아무 경로나 된다.

```bash
export CLAIRVEIL_SRC=$HOME/clairveil
git clone https://github.com/DELIGHT-LABS/clairveil.git "$CLAIRVEIL_SRC"
git -C "$CLAIRVEIL_SRC" checkout ca85b02708fdd75259d4d2ee2d671c21198cec69
git -C "$CLAIRVEIL_SRC" apply "$PWD/recipe/03-privacy-local/patches/clairveil-withdraw-snapshot.patch"
(cd "$CLAIRVEIL_SRC" && go build -o ~/go/bin/clairveild ./cmd/clairveild && go build -o ~/go/bin/clairveil-setup ./cmd/clairveil-setup)
(cd "$CLAIRVEIL_SRC" && scripts/init-localnet.sh)
```

`init-localnet.sh`는 `alice`, `bob`, `auditor`, `relayer` 키와 ZK artifact를 만든다. 직원 키 두 개를 더 만든다. 니모닉은 저장하지 않는다.

```bash
clairveild keys add carol --keyring-backend test --home ~/.clairveil
clairveild keys add dave --keyring-backend test --home ~/.clairveil
```

새 터미널에서 artifact 환경을 읽고 노드를 시작한다.

```bash
source ~/.clairveil/clairveil.env
clairveild start --home ~/.clairveil
```

`~/.clairveil/clairveil.env`에는 deposit, spend, joinsplit, batch joinsplit artifact의 SHA256이 있어야 한다. `CLAIRVEIL_PRIVACY_ZK_PREFLIGHT_MODE=strict`도 확인한다. 다른 터미널에서 recipe를 실행한다.

```bash
node recipe/03-privacy-local/privacy-payroll.ts
node recipe/03-privacy-local/privacy-payroll.ts 2
```

독자가 읽고 실행하는 파일은 `privacy-payroll.ts` 하나다. TypeScript에서 `clairveild`를 자식 프로세스로 호출하고 JSON 결과를 검사한다. 두 번째 명령처럼 단계 하나만 실행할 수 있다. 앞 단계의 `out` 파일이 필요한 단계는 앞 단계를 먼저 실행한다.

## 입력값

| 이름 | 방법 | 기본값 |
| --- | --- | --- |
| 단계 | 첫 번째 인자 | `all`, 또는 `1`부터 `5` |
| `CLAIRVEIL_SRC` | 셸 변수. 사전 요구 사항의 clone, patch, build 명령에서만 쓰고 `privacy-payroll.ts`는 읽지 않는다 | 없음. 직접 정한다 |
| `CLAIRVEIL_HOME` | 환경 변수 | `$HOME/.clairveil` |
| `CLAIRVEILD` | 환경 변수. 노드를 띄운 것과 같은 바이너리를 준다 | `clairveild` |
| `NODE` | 환경 변수 | `tcp://localhost:26657` |
| `GRPC_ADDR` | 환경 변수 | `localhost:9090` |
| `CHAIN_ID` | 환경 변수 | `clairveil-local-1` |
| `DENOM` | 환경 변수 | `uclair` |
| `EMPLOYEES` | 환경 변수 | `bob carol dave` |
| `SALARIES` | 환경 변수 | `4 5 6` |
| `DEPOSIT_AMOUNT` | 환경 변수 | `20` |
| `WITHDRAW_AMOUNT` | 환경 변수 | `4` |
| `BATCH_GAS` | 환경 변수 | `80000000` |
| `GAS_PRICES` | 환경 변수 | `8500000000uclair` |

직원 수와 급여 수는 같아야 한다. 직원은 세 명 이상이어야 한다. 예치액은 급여 합계보다 커야 한다. 회로 상한은 입력 16개, 출력 32개다. 근거는 Clairveil의 `x/privacy/types/batch_contract.go`에 있는 `BatchJoinSplitV1MaxInputs`와 `BatchJoinSplitV1MaxOutputs`다.

## 예상 결과

2026년 9월 3일 실행 결과다. gas_used는 실행마다 수천 단위로 달라진다(9월 4일 재실행: 1,290,308 / 3,054,641 / 1,091,491). 원본 JSON은 `evidence/local-privacy/evidence/recipe-*.json`에 있다.

| 단계 | 결과 | tx 해시 | gas_used |
| --- | --- | --- | ---: |
| 1 | `alice`가 20uclair 노트 한 개를 예치 | `AF436B203C615128C9F301C6FE81DEE2D8A19591CD3FA50E725E5227D708C827` | 1,285,933 |
| 2 | 입력 1개, 출력 4개인 `MsgBatchTransfer` 한 건 | `B64462562934EDA28E733CC65868C273F194898CE964636E9718597DAA2F1C1D` | 3,037,330 |
| 3 | `bob`이 4uclair 노트를 복구 | 해당 없음 | 해당 없음 |
| 4 | `relayer`가 4uclair 출금을 제출 | `15A9AA6B5ADDD3397B717B97004396944B0B7424B5815CF667D70EC4AA8D57BE` | 1,091,425 |
| 5 | 출력 0을 감사자, 기업(`alice`), 직원(`bob`) 세 키로 복호화. 셋 다 `Verified` 4uclair, 같은 송신자와 수신자 | 해당 없음 | 해당 없음 |
| 6 | evidence 기록: 네 출력 전부 audit과 self view `Verified`, recipient는 출력 0만 `Verified` | 해당 없음 | 해당 없음 |

1단계 원본은 [deposit 응답](../../evidence/local-privacy/evidence/recipe-1-deposit.json)과 [tx 조회](../../evidence/local-privacy/evidence/recipe-1-deposit-query.json)에 있다. 2단계 원본은 [batch 응답](../../evidence/local-privacy/evidence/recipe-2-batch-transfer.json)과 [tx 조회](../../evidence/local-privacy/evidence/recipe-2-batch-query.json)에 있다. tx body에는 `MsgBatchTransfer` 한 개가 있다. 이벤트에는 `input_count=1`, `output_count=4`가 있다.

`alice`의 20uclair 노트는 `spendable`에서 `spent`로 바뀐다. nullifier `2c7a4dbd76a83597430e5dd8bb6f2a5f790ffc74e7449f6601557f4efff78299`가 기록된다. 직원 노트는 4, 5, 6uclair다. `alice`의 새 거스름돈 노트는 5uclair이며 `spendable`이다. 상태 원본은 [alice 노트](../../evidence/local-privacy/evidence/recipe-2-alice-notes-after.json)와 [bob 노트](../../evidence/local-privacy/evidence/recipe-3-bob-notes.json)에 있다.

감사와 self view는 모두 4, 5, 6, 5uclair를 복원한다. [audit 결과](../../evidence/local-privacy/evidence/recipe-5-audit-report.json)와 [self view 결과](../../evidence/local-privacy/evidence/recipe-6-self-view-report.json)를 비교한다. `bob`의 recipient plane은 첫 출력의 송신자, 수신자, 4uclair만 복원한다. 나머지 세 출력은 `NotPresent`다. 원본은 [recipient 결과](../../evidence/local-privacy/evidence/recipe-6-recipient-report.json)에 있다.

## 확인 방법

1. 1단계에서 deposit tx의 `code`가 0인지 본다. 이후 노트 목록에 20uclair 노트 한 개가 추가됐는지 본다.
2. 2단계 tx body에 `/clairveil.privacy.v1.MsgBatchTransfer` 한 개만 있는지 본다. `input_count`는 1, `output_count`는 4다. 20uclair 입력 노트는 `spent`다. nullifier는 한 개다. 직원 노트 세 개와 거스름돈 노트 한 개는 새 `unspent` 출력이다. CLI의 노트 상태 이름은 `spendable`이다.
3. 3단계에서 `bob`의 tx 해시가 2단계 해시와 같고 금액이 4인지 본다.
4. 4단계에서 제출자는 `relayer`이고 공개 수령인은 `bob`인지 본다. tx `code`가 0인지 본다. [출금 후 bob 노트](../../evidence/local-privacy/evidence/recipe-4-bob-notes-after.json)에서 4uclair 노트가 `spent`인지 본다.
5. 5단계 출력에서 audit, self-view, recipient 세 줄의 첫 항목이 모두 `Verified 4uclair`인지 본다. `out/ts-5-audit-report.json`과 `ts-6-self-view-report.json`의 출력 0이 같은 송신자, 수신자, 금액을 담고 있는지 비교한다. recipient 결과는 출력 0만 `Verified`이고 나머지는 `NotPresent`다. 네 출력 전부는 evidence의 recipe-5, recipe-6 JSON으로 확인한다.

5단계는 2단계 tx 본문의 출력별 암호화 사본을 `decode-transfer-disclosure`에 ciphertext hex로 직접 넘겨 복호화한다. `--tx-hash`는 단일 `MsgTransfer` 이벤트만 찾아 배치 tx에는 쓸 수 없다. v0.4.0 CLI는 output_index 0의 digest만 재계산하므로 출력 1 이상은 `CliUnsupported`로 표시된다. 네 출력 전부를 복호화한 기록은 `evidence/local-privacy/evidence/recipe-5-audit-report.json`과 `recipe-6-*.json`에 있다.

## 오류 처리

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| artifact checksum mismatch | 바이너리, genesis, artifact 버전이 다름 | commit을 확인하고 `scripts/init-localnet.sh`를 다시 실행한다. `~/.clairveil/clairveil.env`를 다시 읽는다 |
| RPC 또는 gRPC 연결 거절 | 노드가 실행되지 않음 | `source ~/.clairveil/clairveil.env` 후 `clairveild start --home ~/.clairveil`를 실행한다 |
| insufficient funds | 공개 잔고가 급여와 수수료보다 적음 | localnet을 다시 초기화하거나 금액을 줄인다 |
| 1단계 deposit 노트를 찾지 못했다 | 단계 파일이 없거나 다른 홈을 사용함 | 같은 `CLAIRVEIL_HOME`으로 1단계를 다시 실행한다 |
| input note is spent | 같은 2단계를 다시 제출함 | 1단계부터 새 예치 노트로 실행한다 |
| payment count 또는 input count exceeds capacity | 출력 32개 또는 입력 16개 상한 초과 | 직원을 31명 이하로 줄여 거스름돈 출력 자리를 남긴다. 거스름돈이 없으면 최대 32명이다 |
| merkle root snapshot re-registration is inconsistent | v0.4.0이 출력 없는 withdraw에서 같은 루트를 새 높이로 재등록함 | 제공한 `clairveil-withdraw-snapshot.patch`를 적용하고 바이너리와 노드를 다시 시작한다 |
| no disclosure payload for plane | 단일 전송용 decode 명령을 배치 tx에 사용함 | 저장된 batch disclosure evidence를 확인한다. v0.4.0에는 TypeScript decoder가 없다 |
| `DecryptFailed` 또는 `DigestMismatch` | 잘못된 disclosure 키 또는 손상된 payload | 역할별 키 이름과 `CLAIRVEIL_HOME`을 확인한다. 값을 감사 결과로 사용하지 않는다 |
