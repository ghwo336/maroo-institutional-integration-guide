# testnet-pcl: PCL 검증 기록

마루 테스트넷(chainId 450815)에서 PCL 프리컴파일 `0x1000000000000000000000000000000000000005`의 동작을 확인한 스크립트와 출력이다. 가이드 4장 PCL의 근거다.

## 대상

2026년 8월 22일 실습에서 배포한 것을 재사용한다.

- PCL 프록시(Transparent): `0x5BCEc33cf3f6496dAF27956fd4C4f157ca0342E3`. EAS_POLICY(스키마 `bool kycVerified`, UID `0xc74e…1a63`)가 selector 없이 바인딩돼 있다.
- 구현 컨트랙트: `0x805F34f3Fa7211A491Bd62a0468b23C786b7AA17` (OpenZeppelin ERC20Upgradeable, KSTOCK).
- attestation 보유 지갑이자 프록시 admin: `0x552B9F6BA65DE19D93F568DEF894d5Efdc1E6866`.

## 파일

| 파일 | 개인키 | 내용 |
| --- | --- | --- |
| `pcl-readonly-probe.mjs` | 불필요 | 프리컴파일 생존 확인, 등록 템플릿, 전역 정책 디코드, 프록시 레지스트리, eth_call 시뮬레이션(규제 트랙, view 차단, 개방 트랙 대조군, 훅 직접 호출, 정책 쓰기 에러, 전역 정책 미평가). |
| `pcl-tx-trace.mjs` | 불필요 | 같은 프록시에 보낸 실제 tx 4건의 영수증과 callTracer. preCall, delegatecall, postCall 가스와 out of gas 실패. gasUsed가 gasLimit의 절반으로 기록되는 표본. |
| `payout-limit-probe.mjs` | 필요 | 마루 문서에 적힌 대로 따라 하며 문서 주장과 다른 곳을 찾는다. 단계마다 재현하는 문서 페이지와 주장을 적어 두었다. Transparent와 UUPS 배포, PclProxyDeployed 토픽 수, 최초 바인딩 주장, selector `0x` 바인딩(managing-contract-policies 예제 그대로), from 지정 eth_call, view 호출, attestation 발급 후 색인 전후와 revoke 후 검사, 실제 tx 가스. 문서와 다르게 한 것은 한도 금액(10 / 25 tOKRW)과 미인증 주소 시뮬레이션의 잔고 state override 둘뿐이다. |
| `limit-error-probe.mjs` | 불필요 | 급여 한도 템플릿 두 개의 초과 에러 이름 실측. 테스트넷에 두 템플릿이 차례로 바인딩됐던 다른 배포자의 프록시 `0x65Ba…B88e`에 그 시점 블록(17217688, 17217690)을 지정한 eth_call을 미인증 주소(잔고 state override)로 보내고 callTracer로 어느 프레임이 되돌렸는지 본다. |
| `contracts/Payout.sol`, `contracts/Payout.json` | | 최소 지급 컨트랙트(payable `pay`, view `version`)와 solc 0.8.28 컴파일 결과(optimizer 200). |
| `evidence/pcl-readonly-probe.txt` | | 2026년 9월 3일 실행 출력. |
| `evidence/pcl-proxy-tx-trace.txt` | | 2026년 9월 3일 실행 출력. |
| `evidence/limit-error-probe.txt` | | 2026년 9월 4일 실행 출력. 단건 초과 `ReachedLimitOfNonEAS(limit, amount)`, 누적 초과 `ExceededPeriodicVolume(max, amount, resetAt)`. 한도 아래 금액은 preCall을 지나 구현 컨트랙트에서 되돌려진다. |
| `evidence/maroo-viem-0.3.0-readme.txt` | | 체인이 아니라 npm 레지스트리에서 받은 것. `@maroo-chain/viem` 0.3.0의 게시 시각과 README 원문. 융합 템플릿 deprecated 표기의 근거. |
| `evidence/maroo-viem-0.3.0-revert-map.txt` | | 같은 패키지의 tarball을 풀어 revert 디코더의 분류 함수를 발췌한 것. tarball sha256 포함. 체인에서 확인한 것이 아니다. |
| `evidence/recipe-read-policies.txt` | | `recipe/02-pcl/read-policies.mjs`의 2026년 9월 3일 실행 출력. 독자용 스크립트가 같은 결과를 내는지 확인한 것. |
| `evidence/eas-get-params.txt` | | 2026년 9월 4일 EAS 프리컴파일 `0x…09`의 `getParams` 호출. 대조군으로 IOkrw `getParams`와 빈 주소를 같이 호출. 가이드 3장 EAS 주소 서술의 근거. |
| `evidence/kyc-testnet-attestation.txt` | | 2026년 9월 4일 kyc-testnet.maroo.io에서 카카오 인증을 한 지갑 `0x552B…6866`의 kakaoIdHash 스키마 attestation을 Indexer와 EAS에서 조회. 대조군으로 미인증 주소. 노트 4번, 14번의 발급 경로 근거. |

## 실행

Node 24, ethers v6, `@maroo-chain/contracts` 0.0.8.

```
npm init -y && npm i ethers@6 @maroo-chain/contracts@0.0.8
node pcl-readonly-probe.mjs > evidence/pcl-readonly-probe.txt
node pcl-tx-trace.mjs > evidence/pcl-proxy-tx-trace.txt
node limit-error-probe.mjs > evidence/limit-error-probe.txt
node payout-limit-probe.mjs --dry
MAROO_PRIVATE_KEY=0x... node payout-limit-probe.mjs > evidence/payout-limit-probe.txt
```

`payout-limit-probe.mjs`의 owner 지갑은 스키마 `0xc74e…1a63` attestation이 있어야 한다. 없으면 이전 실습의 `step2-attest.ts`로 발급하고 Indexer에 색인한다. `KYC_USER_KEY`에 attestation 없는 지갑(잔고 30 tOKRW 이상)을 주면 단건 초과와 누적 초과의 실제 거절 tx까지 만든다. `PAYOUT_PROXY`를 주면 배포와 바인딩을 건너뛴다. F 단계는 owner가 스키마 `0xc74e…1a63`의 issuer라는 전제로 임의 주소에 attestation을 발급하고 revoke한다.

## 가이드 4.2 주장과 근거 위치

| 가이드 4.2의 주장 | 파일 | 절 |
| --- | --- | --- |
| 프리컴파일은 eth_getCode 0x지만 호출에 답한다 | pcl-readonly-probe.txt | 1 |
| 등록 템플릿 9개 | pcl-readonly-probe.txt | 2 |
| 테스트넷 전역 정책(단건 200만, 24h 1,000만, kakaoIdHash 면제) | pcl-readonly-probe.txt | 3 |
| pclProxy(addr).kind로 등록 확인 | pcl-readonly-probe.txt | 4 |
| 프록시 eth_call: from 유무에 따른 EasNoAttestationReceived | pcl-readonly-probe.txt | 5 |
| selector 없는 정책이 view 호출까지 거절 | pcl-readonly-probe.txt | 6 |
| 구현 컨트랙트 직접 호출(개방 트랙)에는 PCL 에러 없음 | pcl-readonly-probe.txt | 7 |
| EOA의 preCall 직접 호출 Unauthorized | pcl-readonly-probe.txt | 8 |
| changeContractPolicies 에러 네 가지, transfer selector 바인딩 통과 | pcl-readonly-probe.txt | 9 |
| eth_call은 전역 정책 미평가 | pcl-readonly-probe.txt | 10 |
| preCall/postCall 가스, 500k 한도 out of gas, gasUsed 절반 청구 | pcl-proxy-tx-trace.txt | 전체 |
| 미인증 초과 에러 이름(단건 ReachedLimitOfNonEAS, 누적 ExceededPeriodicVolume) | limit-error-probe.txt | 전체 |

## 확인한 것 (2026년 9월 3일)

직접 실행한 것.

- 프리컴파일은 `eth_getCode`가 `0x`지만 호출에 답한다. 모르는 selector에는 `Error("no method with id: …")`로 revert.
- 등록 템플릿 9개: 리프 7개, 조합 2개(LOGICAL_POLICY, FOR_EACH_POLICY).
- 전역 정책: 단건 200만 tOKRW 이하 또는 스키마 `bytes32 kakaoIdHash, uint8 version` attestation. 24시간 누적 1,000만 tOKRW 이하 또는 같은 attestation. `globalPeriodicVolume(addr, "atokrw", 86400, false)`가 남은 한도를 준다.
- 프록시로 eth_call: attestation 없는 from은 `EasNoAttestationReceived(from)`, 있는 from은 통과, from 생략은 zero address로 거절.
- selector 없이 바인딩한 정책은 `name()`, `balanceOf()` 같은 view 호출도 거절한다.
- 구현 컨트랙트 직접 호출(개방 트랙)에는 PCL 에러가 없다.
- EOA가 `preCall`을 직접 부르면 `Unauthorized()`.
- `changeContractPolicies`: 비admin `Unauthorized()`, 프록시가 아닌 미바인딩 주소 `ContractPolicyNotRegistered(addr)`, 없는 템플릿 `UnknownPolicyType(id)`, 3바이트 selector `InvalidSelector`.
- Privacy 프리컴파일 주소 `0x…0b`에 컨트랙트 정책이 바인딩돼 있다. EAS_POLICY(스키마 `0x3e44…527d`, selector 없음)와 DENYLIST_POLICY, admin은 policyAdmin `0x58eC…804F`. `pclProxy` kind는 0. 출력 `evidence/privacy-address-policies.txt`.
- eth_call은 전역 정책을 평가하지 않는다. state override로 잔고를 준 임의 주소가 2,000만 tOKRW를 보내는 eth_call이 통과하고 estimateGas는 21,000.
- 실제 tx 프레임 가스: preCall 281,696, delegatecall(transfer) 29,993, postCall 287,583. estimateGas 625,750. gasLimit 500,000인 tx 두 건은 postCall에서 out of gas.
- gasUsed가 gasLimit의 정확히 절반으로 기록되는 tx: 이 프록시 tx 2건, 익스플로러 최근 50건 중 10건. 원인은 Cosmos EVM feemarket의 min gas multiplier(0.5)로 추정하며 파라미터는 조회하지 못했다.
- (9월 4일 추가) OKRW_EAS_TRANSFER_LIMIT_POLICY 초과는 `ReachedLimitOfNonEAS(limit, amount)`, OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY 초과는 `ExceededPeriodicVolume(max, amount, resetAt)`. 두 템플릿이 바인딩됐던 시점의 블록을 지정한 eth_call로 확인했고 preCall 프레임에서 되돌려진다. 테스트넷 RPC는 과거 블록 상태 조회와 `debug_traceCall`의 stateOverrides를 받는다. 출력 `evidence/limit-error-probe.txt`.

문서로만 확인하고 실행하지 않은 것.

- 규제 프레임 안 내부 전송의 호출자 귀속과 주기 누적 규칙.
- 은행 지갑이 직접 배포한 프록시에서 한도 초과가 실제 tx로 거절되는 모습. 에러 이름은 위 eth_call로 확정했고, 실제 거절 tx 해시는 `payout-limit-probe.mjs`를 개인키로 실행해야 생긴다.
- 전역 정책이 실제 tx에서 거절하는 모습. 200만 tOKRW 초과 잔고가 없어 보내지 못했다.
