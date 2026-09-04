# 02-pcl: 정책 설정 (PCL)

가이드 4.2의 예제다. 파일 하나가 한 가지 일만 한다.

| 파일 | 개인키 | 하는 일 |
| --- | --- | --- |
| `read-policies.mjs` | 불필요 | 등록 템플릿, 전역 정책, Privacy 프리컴파일 주소에 붙은 정책, 한 주소의 남은 누적 한도를 읽는다 |
| `simulate.mjs` | 불필요 | 프록시로 `eth_call`을 세 번 보낸다. 지정한 from, attestation 없는 임의 주소, from 생략. 통과인지 어떤 에러인지 찍는다 |
| `setup-payroll-policy.mjs` | 필요 (`--dry`는 불필요) | `Payout.sol` 배포, PCL 프록시 배포, 규칙 두 개를 `pay(address)` selector에 바인딩 |

`Payout.sol`은 기업이 `msg.value`로 재원을 대고 수취인에게 바로 보내는 최소 컨트랙트다. 컴플라이언스 코드가 없다. `Payout.json`은 solc 0.8.28, optimizer 200 컴파일 결과다.

## 사전 요구 사항

- Node 24
- `recipe/` 폴더에서 `npm install` 한 번 (ethers v6, @maroo-chain/contracts 0.0.8)
- `setup-payroll-policy.mjs`를 실제로 돌리려면 tOKRW가 있는 지갑. 배포 두 건과 바인딩 한 건에 약 10 tOKRW면 충분하다. `https://faucet.maroo.io`
- 바인딩한 규칙이 통과하는 모습까지 보려면 그 지갑에 `KYC_SCHEMA_UID` 스키마의 attestation이 있어야 한다. 없어도 스크립트는 끝까지 돌고, 시뮬레이션이 전부 미인증 기준으로 나온다

## 입력값

```
cd recipe/02-pcl
node read-policies.mjs [주소]
PROXY=0x... FROM=0x... node simulate.mjs
PROXY=0x... FROM=0x... CALL=pay VALUE=1 node simulate.mjs
node setup-payroll-policy.mjs --dry
MAROO_PRIVATE_KEY=0x... node setup-payroll-policy.mjs
```

| 스크립트 | 이름 | 방법 | 기본값 |
| --- | --- | --- | --- |
| read-policies | 주소 | 첫 번째 인자. 남은 전역 누적 한도를 읽을 주소 | 샘플 프록시의 admin `0x552B…6866` |
| simulate | `PROXY` | 환경 변수 | 2026년 8월 22일 실습 프록시 `0x5BCE…42E3` (EAS_POLICY, selector 없음) |
| simulate | `FROM` | 환경 변수, 지정 from | `0x552B…6866` (attestation 보유) |
| simulate | `CALL` | `transfer` 또는 `pay` | `transfer` |
| simulate | `VALUE` | tOKRW 단위. `pay`일 때 실어 보낼 금액 | `0` |
| setup | `--dry` | 인자. 인코딩만 출력 | 없음 |
| setup | `MAROO_PRIVATE_KEY` | 환경 변수, 은행 지갑 | 없음. `--dry`가 아니면 필수 |
| setup | `KYC_SCHEMA_UID` | 환경 변수, 은행 KYC 스키마 | `0xc74e…1a63` (`bool kycVerified`) |
| setup | `SINGLE_LIMIT`, `PERIOD_MAX` | 환경 변수, 미인증 단건과 24시간 누적 상한, tOKRW | `10`, `25` |
| setup | `PAYOUT_PROXY` | 환경 변수 | 없음. 주면 1, 2단계를 건너뛰고 바인딩만 다시 한다 |
| 공통 | `MAROO_RPC` | 환경 변수 | `https://rpc-testnet.maroo.io` |

### 배포와 바인딩 절차

`setup-payroll-policy.mjs`가 하는 일을 순서대로 적으면 이렇다.

1. 급여 컨트랙트를 배포한다. 재원을 받는 함수는 `payable`이다. 컴플라이언스 코드는 넣지 않는다.
2. `IPcl.deployPclProxy(kind, value, initData)`를 부른다. kind는 Transparent(1), initData는 `abi.encode(logic, initialOwner, initializerCalldata)`다. 체인이 프록시를 배포하고 같은 트랜잭션에서 레지스트리에 등록하며, 호출자를 정책 admin으로 잡는다. 프록시 주소는 `PclProxyDeployed(proxy, deployer, kind)` 이벤트에서 얻는다.
3. `IPcl.changeContractPolicies({_contract: proxy, admin, policies})`로 규칙을 붙인다. 배열 전체가 교체되므로 규칙 하나를 바꿀 때도 현재 배열을 읽어 고친 뒤 통째로 다시 쓴다.

`policies` 배열의 항목마다 세 값이 들어간다.

| 값           | 뜻                                        | 급여 컨트랙트의 값                                                        |
| ------------ | ----------------------------------------- | ------------------------------------------------------------------------- |
| `templateId` | 체인에 등록된 규칙 종류의 이름            | `OKRW_EAS_TRANSFER_LIMIT_POLICY`, `OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY` |
| `policy`     | 그 규칙의 파라미터를 `abi.encode`한 bytes | 아래 표                                                                   |
| `selector`   | 어느 함수 호출에 적용할지, 4바이트        | `pay` 함수의 selector                                                     |

급여에 쓰는 두 템플릿의 파라미터다. `easContract`와 `indexContract`는 하드코딩하지 않고 IEas `getParams`에서 읽는다.

| templateId                            | 파라미터                                                                 | 동작                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| OKRW_EAS_TRANSFER_LIMIT_POLICY        | `(easContract, indexContract, schemaUid, transferLimitAmount)`           | attestation이 있으면 금액 제한 없음, 없으면 단건 transferLimitAmount 이하 |
| OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY | `(easContract, indexContract, schemaUid, maxAmount, resetPeriodSeconds)` | attestation 없는 발신자에게만 주기 누적 상한                              |

ABI는 `@maroo-chain/contracts/abi/precompiles/pcl/IPcl`의 `iPclAbi`다. 문서에 적힌 `pclAbi` 경로는 패키지 0.0.8에 없다. 이 예제는 ethers와 원시 ABI로 각 단계를 드러내려고 썼다. 실제 백엔드에서는 `@maroo-chain/viem` 0.3.0의 `walletClient.pcl.deployPclProxy`, `policy.*` 빌더, `publicClient.pcl.simulatePclProxy`, `PclRevert.decode`를 쓰는 편이 짧다. 그 README는 이 예제가 쓰는 OKRW_EAS 융합 템플릿 둘을 deprecated로 표기하고 `policy.or(policy.periodicVolume(...), policy.eas(...))` 조합을 권한다.

## 예상 결과

2026년 9월 3일 출력 전문은 [evidence/testnet-pcl/evidence/recipe-read-policies.txt](../../evidence/testnet-pcl/evidence/recipe-read-policies.txt)와 [recipe-simulate.txt](../../evidence/testnet-pcl/evidence/recipe-simulate.txt)에 있다. 요점은 이렇다.

```
2. 전역 정책
  [0] FOR_EACH Every AgentOwners: OR( 누적 atokrw max 10000000 tOKRW / 86400s, attestation 스키마 0x3e44…527d )
  [1] OR( 단건 atokrw max 2000000 tOKRW, attestation 스키마 0x3e44…527d, FOR_EACH Any AgentOwners(같은 스키마) )
3. Privacy 프리컴파일 주소에 붙은 정책
  admin: 0x58eC…804F (policyAdmin)
  attestation 스키마 0x3e44…527d (selector=모든 호출), DENYLIST_POLICY

simulate (샘플 프록시, transfer)
  from=0x552B…6866: OK
  from=attestation 없는 임의 주소: REVERT EasNoAttestationReceived(0x239c…50AA)
  from 생략: REVERT EasNoAttestationReceived(0x0000…0000)
  estimateGas: 620950
```

`setup-payroll-policy.mjs --dry`는 selector `0x0c11dedd`와 정책 바이트 두 줄을 찍는다. 실제 배포 실행 결과는 2026년 9월 4일 현재 기록이 없다. 바인딩한 두 규칙이 미인증 지갑에 돌려주는 에러는 같은 템플릿이 붙었던 다른 프록시에 그 시점 블록을 지정한 `eth_call`로 확인했다. 단건 초과는 `ReachedLimitOfNonEAS(limit, amount)`, 누적 초과는 `ExceededPeriodicVolume(max, amount, resetAt)`이며 출력은 [evidence/testnet-pcl/evidence/limit-error-probe.txt](../../evidence/testnet-pcl/evidence/limit-error-probe.txt)에 있다.

## 확인 방법

- read-policies 2번에서 단건 200만, 누적 1,000만 tOKRW와 스키마 `0x3e44…527d`가 보이면 전역 정책을 제대로 읽은 것이다. 정책 admin이 바꿀 수 있으니 실행 시점 값을 쓴다.
- read-policies 3번에서 Privacy 주소의 admin이 policyAdmin과 같으면, 비공개 풀 입구 정책은 은행이 아니라 마루가 관리한다는 것을 직접 본 것이다.
- simulate에서 from에 따라 결과가 갈리면 프록시의 컨트랙트 정책이 살아 있는 것이다. from을 뺀 호출이 zero address로 거절되는 것까지 보라.
- 전역 정책은 `eth_call`이 평가하지 않는다. 잔고 없는 임의 주소의 시뮬레이션이 통과해도 실제 트랜잭션은 전역 한도에 걸릴 수 있으니 read-policies 4번으로 남은 한도를 본다.
- `setup-payroll-policy.mjs`를 실제로 돌린 뒤에는 `PROXY=<새 프록시> FROM=<은행 주소> CALL=pay VALUE=1 node simulate.mjs`로 규칙이 붙었는지 본다. `pclProxy(addr).kind`가 0이 아니면 등록된 프록시다. 프리컴파일 생존 여부는 `eth_getCode`로 볼 수 없다. 바이트코드가 없어 `0x`가 오므로 읽기 함수 응답으로 본다.
- 익스플로러 `https://explorer-testnet.maroo.io/address/<프록시>`에서 프록시 배포 tx와 바인딩 tx를 볼 수 있다.

## 오류 처리

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| `Cannot find module '@maroo-chain/contracts/...'` | `recipe/`에서 `npm install`을 안 함 | `cd recipe && npm install` |
| 4번 `pclProxy(proxy).kind = 0` | `PROXY`가 PCL 프록시가 아님 | `deployPclProxy`로 만든 주소인지 확인. 구현 컨트랙트 주소를 넣으면 0이다 |
| `ContractPolicyNotRegistered(addr)` | 프록시가 아닌 주소에 `changeContractPolicies` | 먼저 `deployPclProxy`를 거친다. 문서는 누구든 최초 바인딩을 할 수 있다고 쓰지만 실제와 다르다 |
| `Unauthorized()` | admin이 아닌 지갑으로 바인딩, 또는 EOA가 `preCall`을 직접 호출 | `contractPolicies(proxy).admin` 지갑으로 보낸다 |
| `UnknownPolicyType(id)` | templateId 오타 | 2번 목록의 이름을 그대로 쓴다 |
| `InvalidSelector(...)` | selector가 4바이트가 아님 | `Interface.getFunction("pay").selector` 값을 쓴다 |
| `EasNoAttestationReceived(0x0000…0000)` | `eth_call`에 `from`을 안 넣음 | `from`을 넣는다. 지갑과 익스플로러의 잔고 조회가 이 형태로 나가면 selector를 비우지 말 것 |
| `EasNoAttestationReceived(<내 주소>)` | 그 주소에 `KYC_SCHEMA_UID` attestation이 없거나 Indexer에 색인되지 않음 | attestation 발급 후 `indexAttestation(uid)`까지 한다 |
| 실제 tx가 postCall에서 out of gas | 가스 한도를 고정값으로 줌 | 한도를 지정하지 않고 `estimateGas` 결과를 쓴다. 훅 두 번에 약 57만 가스가 든다 |
| `insufficient funds` | 배포 가스 부족 | faucet에서 받는다 |
| `ReachedLimitOfNonEAS(limit, amount)` | attestation 없는 지갑의 단건 한도 초과. 문서 세 곳이 다른 이름을 쓰지만 실제 응답은 이것이다 | 금액을 줄이거나 attestation을 발급한다. 디코더에는 IPcl ABI의 에러 전체를 넣는다 |
| `ExceededPeriodicVolume(max, amount, resetAt)` | attestation 없는 지갑의 24시간 누적 한도 초과 | `resetAt` 이후에 보내거나 attestation을 발급한다 |
