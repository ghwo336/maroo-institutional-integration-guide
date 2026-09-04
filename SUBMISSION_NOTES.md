# SUBMISSION NOTES

과제 문서 3절의 항목 순서를 따른다. 상세 근거는 [evidence/](evidence/README.md), 문서 이슈의 상세본은 [docs/documentation-improvement-notes.md](docs/documentation-improvement-notes.md)에 있고 여기서는 같은 내용을 반복하지 않는다.

## 1. Assumptions / Discrepancies

### 대상 독자 가정

과제가 정한 독자는 EVM, Solidity, TypeScript, REST, JSON-RPC에 익숙하고 마루와 ZK 프라이버시는 처음인 기관 시니어 엔지니어다. 여기에 둘을 더했다. Cosmos 용어(denom, x/모듈)는 모른다고 보고 첫 등장에서 정의한다. 프리컴파일, ERC-20, 가스, 머클 트리 개념은 안다고 보고 설명하지 않는다. 가이드 1장에서 독자를 기업 고객에게 급여 지급 서비스를 제공하려는 은행 플랫폼 팀으로 좁혔다. 증권사와 지급 사업자 엔지니어도 같은 자리에서 읽을 수 있다.

### 실제 구현과 제안의 구분

| 급여 지급 단계                                                  | 구분                                                                                                                                  | 근거                                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1. 직원 KYC와 EAS attestation 발급                              | 문서 기반 제안. 테스트넷 EAS 주소 조회(`getParams`)만 직접 검증                                                                       | `evidence/testnet-pcl/evidence/eas-get-params.txt`                                                         |
| 2. 기업 OKRW 예치와 PCL 한도 평가                               | OKRW 전송과 PCL 프록시 정책 평가는 테스트넷 직접 검증. Privacy 예치 자체는 로컬 Clairveil. 둘을 잇는 PolicyOperation 규칙은 문서 확인 | `evidence/testnet-precompile/`, `evidence/testnet-pcl/`, `evidence/local-privacy/evidence/recipe-1-*.json` |
| 3. 증명 하나로 직원 N명 일괄 지급                               | 로컬 Clairveil 직접 실행                                                                                                              | `evidence/local-privacy/evidence/recipe-2-*.json`                                                          |
| 4. 직원 노트 스캔                                               | 로컬 Clairveil 직접 실행                                                                                                              | `recipe-3-bob-notes.json`                                                                                  |
| 5. 은행 relayer의 `withdrawWithAuthorization`                   | Clairveil relayer 출금은 직접 실행. 마루 EIP-712 위임 경로는 문서 확인                                                                | `recipe-4-*.json`                                                                                          |
| 6. 감사자 복호화와 기업 self-view 대사                          | 로컬 Clairveil 직접 실행                                                                                                              | `recipe-5-audit-report.json`, `recipe-6-*.json`                                                            |
| 은행이 PCL admin, 프록시 admin, attester, relayer를 분리 운영   | 제안                                                                                                                                  | 가이드 6장                                                                                                 |
| push 구조, selector 한정 바인딩, 예치 시점 한도 통제, 분할 출금 | 관찰에 따른 설계 제안                                                                                                                 | `evidence/README.md` 표                                                                                    |

### 의도적으로 제외한 범위

- MAWS와 에이전트 지갑, ERC-8004. 급여 흐름에 등장하지 않는다.
- ZK 회로 내부 구조와 증명 시스템의 수학. 은행이 관리할 것(prover 위치, artifact 해시)만 다룬다.
- 감사 키 커스터디의 구현. 보유자와 침해 영향까지만 다룬다.
- Open Path와 기타 마루 상품.
- 배당 지급 변형. 재원 출처와 수취인 목록만 다를 뿐 단계가 같아 가이드 4장 도입 한 문장과 FAQ의 disclosure 항목으로만 다뤘다.

### 발견한 차이

기준 버전은 docs.maroo.io 미러(2026년 9월 2일, 146페이지), 마루 테스트넷 chainId 450815(2026년 9월 2일부터 4일), Clairveil v0.4.0 commit `ca85b02`, npm `@maroo-chain/viem` 0.3.0과 `@maroo-chain/contracts` 0.0.8이다. 전체 버전 기록은 [evidence/local-privacy/VERSIONS.md](evidence/local-privacy/VERSIONS.md)에 있다.

번호는 [docs/documentation-improvement-notes.md](docs/documentation-improvement-notes.md)의 항목 번호다.

| 번호 | 심각도 | 한 줄                                                                                                                                                 | 근거                                                                                                                      |
| ---- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1    | 높음   | 공식 SDK `@maroo-chain/viem` 0.3.0이 문서에 없고, 문서의 OKRW_EAS 융합 템플릿 두 개를 SDK가 deprecated로 표기                                         | `evidence/testnet-pcl/evidence/maroo-viem-0.3.0-deprecated.txt`                                                           |
| 2    | 높음   | Privacy deposit 예제의 `buildDepositWitness`가 미정의이고 회로 산출물, prover, REST가 미공개라 외부 개발자는 완주 불가                                | `evidence/testnet-privacy/evidence/privacy-deposit-probe.txt`                                                             |
| 3    | 높음   | OKRW ERC-20 표현 주소 `0xEeee…EEeE`가 테스트넷 미등록. `transfer`가 효과 없이 성공 처리                                                               | `evidence/testnet-precompile/evidence/okrw-erc20-check.txt`, `erc20-transfer-probe.txt`                                   |
| 4    | 중     | Privacy 주소에 kakaoIdHash EAS_POLICY와 DENYLIST_POLICY가 바인딩된 사실이 문서에 없고, 그 attestation을 발급하는 KYC (mock) 링크와의 연결 설명도 없음 | `evidence/testnet-pcl/evidence/privacy-address-policies.txt`, `evidence/testnet-pcl/evidence/kyc-testnet-attestation.txt` |
| 5    | 중     | withdraw 코인 문자열(`aokrw` 대 `atokrw`)과 chainId(`maroo-testnet` 대 `maroo-testnet-1`)가 문서 예제와 다름. 문서대로 주면 거절                      | `privacy-deposit-probe.txt` 4b, `privacy-deposit-probe-after-kyc.txt` 4b                                                  |
| 6    | 중     | 컨트랙트 정책 최초 바인딩을 누구나 할 수 있다고 쓰나 실제는 `ContractPolicyNotRegistered`                                                             | `pcl-readonly-probe.txt` 9번                                                                                              |
| 7    | 중     | 비admin 정책 변경 에러가 문서 `PolicyAlreadyRegistered`, 실제 `Unauthorized()`                                                                        | 같은 파일 9번                                                                                                             |
| 8    | 중     | 한도 초과 에러 이름이 문서 세 페이지에서 다름. 과거 블록 `eth_call` 실측은 단건 `ReachedLimitOfNonEAS`, 누적 `ExceededPeriodicVolume`              | `limit-error-probe.txt`, `maroo-viem-0.3.0-revert-map.txt`                                                                |
| 9    | 중     | selector 없는 정책이 view 호출까지 거절하고 `from` 없는 `eth_call`은 zero address로 평가                                                              | `pcl-readonly-probe.txt` 5, 6번                                                                                           |
| 10   | 중     | 프록시 훅 가스(preCall 약 28만, postCall 약 29만)와 gasUsed 최소 gasLimit/2 청구 미기재                                                               | `pcl-proxy-tx-trace.txt`                                                                                                  |
| 11   | 중     | `eth_call`이 전역 정책을 평가하지 않는데 문서는 전체 평가라고 씀                                                                                      | `pcl-readonly-probe.txt` 10번                                                                                             |
| 12   | 중     | 프리컴파일이 네 개라는 서술에 Privacy `0x…0b`가 빠짐                                                                                                  | `privacy-deposit-probe.txt`                                                                                               |
| 13   | 중     | 익스플로러 OKRW 검색에 무관한 테스트 ERC-20 두 개 노출                                                                                                | 익스플로러 검색. 캡처는 리포에 넣지 않음                                                                                  |
| 14   | 중     | 테스트넷 전역 정책 값(단건 200만, 24시간 1,000만 tOKRW) 미기재. 면제 attestation 발급 경로는 KYC (mock) 링크와 목록 한 줄뿐이고 스키마 설명 없음      | `pcl-readonly-probe.txt` 3번, `evidence/testnet-pcl/evidence/kyc-testnet-attestation.txt`                                 |
| 15 | 낮음 | 내부 링크 404 두 개, 참조 페이지 5개 6곳 | 문서 미러 grep                                                                                                            |
| 16   | 낮음   | `pclAbi` import 경로 네 가지 전부 패키지 0.0.8에 없음                                                                                                 | npm 패키지 확인                                                                                                           |
| 17   | 낮음   | EAS 템플릿 예제의 주소 하드코딩                                                                                                                       | 문서                                                                                                                      |
| 18   | 낮음   | `ExceededAgentTransferLimit`를 두 정책에 재사용                                                                                                       | 문서, `maroo-viem-0.3.0-revert-map.txt`                                                                                   |
| 19   | 낮음   | 프록시 종류가 한 페이지는 Transparent만, 다른 페이지는 UUPS 포함                                                                                      | `pcl-readonly-probe.txt` 4번                                                                                              |
| 20   | 제안   | 프리컴파일 생존 확인 방법 부재                                                                                                                        | `okrw-erc20-check.txt` 대조군                                                                                             |
| 21   | 제안   | 원화와 OKRW 사이 발행, 상환 절차 부재                                                                                                                 | 문서 미러 grep 0건                                                                                                        |

## 2. Validation

### 환경

macOS(Darwin 25.6), Go 1.26.4, Node 24.18.0, ethers v6, Hardhat 3.14. Clairveil v0.4.0 commit `ca85b02708fdd75259d4d2ee2d671c21198cec69`. 마루 테스트넷 chainId 450815, RPC `https://rpc-testnet.maroo.io`.

### 실행한 명령

테스트넷. 개인키는 환경 변수로만 넣었고 리포에 없다.

```bash
# OKRW ERC-20 표현 주소 등록 여부 (2026-09-02, 대조군 포함)
# 호출 순서와 원본 응답은 evidence/testnet-precompile/evidence/okrw-erc20-check.txt 상단
PRIVATE_KEY=0x... TO=0x... node evidence/testnet-precompile/erc20-probe.mjs   # 0xEeee transfer 실제 전송, 09-02와 09-03 두 번

# PCL (2026-09-03)
cd evidence/testnet-pcl
node pcl-readonly-probe.mjs > evidence/pcl-readonly-probe.txt
node pcl-tx-trace.mjs > evidence/pcl-proxy-tx-trace.txt
node payout-limit-probe.mjs --dry     # 인코딩만. 실제 실행은 하지 않음
node limit-error-probe.mjs > evidence/limit-error-probe.txt   # 2026-09-04. 한도 초과 에러 이름을 과거 블록 eth_call로 실측

# Privacy 프리컴파일 더미 인자 (2026-09-03)
node evidence/testnet-privacy/privacy-deposit-probe.mjs > evidence/testnet-privacy/evidence/privacy-deposit-probe.txt
# 같은 프로브를 kyc-testnet.maroo.io 카카오 인증 뒤 재실행 (2026-09-04). attestation 조회는 evidence/testnet-pcl/evidence/kyc-testnet-attestation.txt 상단 명령
cd evidence/testnet-privacy && node privacy-deposit-probe.mjs > evidence/privacy-deposit-probe-after-kyc.txt

# 독자용 recipe가 같은 결과를 내는지 (2026-09-03)
cd recipe/02-pcl && node read-policies.mjs && node simulate.mjs
cd recipe/01-okrw && node okrw.mjs
```

로컬 Clairveil. 절차는 [recipe/03-privacy-local/README.md](recipe/03-privacy-local/README.md)에 있다.

```bash
git apply recipe/03-privacy-local/patches/clairveil-withdraw-snapshot.patch
scripts/init-localnet.sh && clairveild start --home ~/.clairveil
node recipe/03-privacy-local/privacy-payroll.ts   # 2026-09-03 실행, 09-04 재실행
```

### 결과와 트랜잭션 해시

| 대상                                  | 결과                                                                      | 해시                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0xEeee `transfer` 1회                 | status 1, gasUsed 21,632, 로그 0, 잔고 변화 0                             | `0x5906df5b49c3cbf43e08087f115b15f2efe5e27ca177251ef92e516499738616` (09-02)                                                               |
| 0xEeee `transfer` 2회                 | 동일                                                                      | `0x945b19026312375c4bc7f9208ee46c38707d3f8db59ee90116ddcd0df676f0e0` (09-03)                                                               |
| PCL 프록시 성공 tx trace              | preCall 281,696 / delegatecall 29,993 / postCall 287,583, gasUsed 750,000 | `0xc2dd4f31efbbe67648ee1ab3b2c0fa667bfd9240d967f4e5c49b57c3f186944c`                                                                       |
| PCL 프록시 gasLimit 500k              | postCall out of gas                                                       | `0xec5c27b7a9c217cfcae2c42116975c4e7993392807a779aa7e8774b1789d771a`, `0x18dfa4d21f834a5da5ac3a79103eb86361c1df497fe1ba9bfd5dcccc3401d045` |
| PCL 프록시 attestation 색인 전        | preCall `EasNoAttestationReceived`                                        | `0x3e696cd403788ede0af895c12a13d188fef5fdda34dc2e3ea36ef9c594d446dd`                                                                       |
| gasUsed가 gasLimit의 절반인 표본 10건 | 익스플로러 최근 50건 중                                                   | `evidence/testnet-pcl/evidence/pcl-proxy-tx-trace.txt`                                                                                     |
| 한도 초과 `eth_call`(블록 17217688, 17217690) | 단건 1,001 tOKRW `ReachedLimitOfNonEAS(limit, amount)`, 누적 10,001 tOKRW `ExceededPeriodicVolume(max, amount, resetAt)`, 한도 아래는 preCall 통과 | 프록시 `0x65Ba55397D329D39A632F789d5A2C3E87c6dB88e`, `evidence/testnet-pcl/evidence/limit-error-probe.txt`                            |
| Clairveil deposit 20uclair            | code 0, gas 1,285,933                                                     | `AF436B203C615128C9F301C6FE81DEE2D8A19591CD3FA50E725E5227D708C827`                                                                         |
| Clairveil 일괄 이체 입력 1, 출력 4    | code 0, gas 3,037,330                                                     | `B64462562934EDA28E733CC65868C273F194898CE964636E9718597DAA2F1C1D`                                                                         |
| Clairveil relayer 출금(패치 전)       | 실패, merkle root snapshot re-registration is inconsistent                | `964581464AC90A8C93635ED1C24B2EBEF6115D5966D4E890BD3BB80A46D90DE8`                                                                         |
| Clairveil relayer 출금(패치 후)       | code 0, gas 1,091,425                                                     | `15A9AA6B5ADDD3397B717B97004396944B0B7424B5815CF667D70EC4AA8D57BE`                                                                         |

실패 결과도 그대로 두었다. 로컬 v0.4.0 CLI는 배치 출력의 output_index 0만 digest를 재계산해 출력 1 이상은 recipe 5단계에서 CliUnsupported로 표시되고, 네 출력 전부는 evidence의 recipe-5, recipe-6 JSON으로 확인했다.

### 직접 검증과 문서 확인의 구분

가이드 본문은 직접 실행한 사실에 날짜와 근거 파일을 붙이고, 문서로만 읽은 사실은 문서 기준이라고 적는다. 주장별 구분표는 [evidence/README.md](evidence/README.md), PCL 주장별 파일 위치는 [evidence/testnet-pcl/README.md](evidence/testnet-pcl/README.md), Privacy 주장별 위치는 [evidence/local-privacy/README.md](evidence/local-privacy/README.md)에 있다.

### 실행하지 못한 것

- `payout-limit-probe.mjs`와 `recipe/02-pcl/setup-payroll-policy.mjs`의 실제 트랜잭션. 인코딩은 `--dry`로 확인했다. 급여 템플릿의 한도 초과 에러 이름은 대신 테스트넷에 같은 템플릿이 바인딩됐던 다른 배포자의 프록시에 과거 블록 `eth_call`을 보내 실측했다. 은행 지갑이 배포한 프록시의 실제 거절 tx 해시는 없다.
- 테스트넷 Privacy deposit. 증명 재료가 없다.
- 전역 정책이 실제 트랜잭션을 거절하는 모습. 200만 tOKRW 초과 잔고가 없었다.
- 메인넷 RPC. 호스트가 DNS에서 풀리지 않았다.

## 3. AI Usage

### 도구

Claude Code(Fable 5.1, Opus 5)와 OpenAI Codex를 썼다. Claude Code는 조사, 스크립트 작성, 초안 작성에 썼고 Codex는 작성된 문장의 검증에 썼다.

### 속도를 높인 곳

1. 문서 불일치 탐색. docs.maroo.io 146페이지를 마크다운으로 미러링하고 grep으로 훑었다. `aokrw` 86회와 `atokrw` 0회, 404 링크 두 개가 이렇게 나왔다.
2. 근거 파일 기반 초안. 내가 직접 실행한 결과를 세션 컨텍스트 파일에 적어 두고, Claude가 가이드와 노트 초안을 쓸 때 그 파일만 근거로 삼게 했다.
3. 검증 스크립트 작성. PCL 읽기 전용 프로브, callTracer 분석, 대조군 호출 스크립트를 문서와 내 실험 결과를 바탕으로 생성했다.
4. 산출물 초안. FAQ, README, SUBMISSION_NOTES 초안과 다이어그램은 evidence와 노트를 정리해 생성했다.
5. 교차 검증. 작성된 문장이 맞는지 확인할 때 별도의 검증 에이전트(Codex)를 두어 Claude의 결과와 대조했다.

### AI 오류를 발견해 고친 곳

1. 익스플로러 EOA 배지를 근거로 삼은 것. Claude가 0xEeee 주소가 미등록이라는 근거로 익스플로러의 EOA 표시를 들었다. 프리컴파일은 노드 안의 Go 코드라 연결되어 있어도 코드 없는 주소로 보이므로 배지로는 연결 여부를 판별할 수 없다고 반박했다. 대신 직접 호출과 트랜잭션으로 확인했다. 0xEeee는 `balanceOf`에 빈 응답을 주고 `transfer`는 gasUsed 21,632로 기본 비용과 calldata 비용만 청구되어 실행된 코드가 없었다. 원인은 코어가 비공개라 추정으로만 남겼다.
2. 발급 경로가 없다는 과장. 에이전트가 가이드와 노트에 attestation 발급 경로가 문서에 없다고 썼다. 리뷰 중 testnet-access 페이지에서 KYC (mock) `kyc-testnet.maroo.io` 한 줄을 찾아 그 페이지에서 카카오 인증을 했고, Indexer 조회로 kakaoIdHash 스키마 attestation 1건이 발급된 것을 확인했다. 인증 전 같은 지갑의 withdraw가 attestation 없음으로 거절됐던 기록과 대조해 인증으로 발급된 것임을 확정했다(`evidence/testnet-pcl/evidence/kyc-testnet-attestation.txt`). 세션 기록을 보면 에이전트는 attester, 발급 주체, kakao 같은 단어로만 미러를 검색했고 kyc나 mock은 검색하지 않았다. 같은 방식으로 적은 부재 주장 11건을 넓은 검색어로 다시 확인했고 이 건만 과장이었다. 가이드와 노트를 고쳤다.
3. OKRW 인터페이스 오기. 4.1 초안이 IOkrw `0x1000…0001`이 ERC-20 인터페이스를 제공한다고 썼고, `approve`와 `transferFrom`을 설계상 불가능한 것처럼 단정했다. 공식 문서를 확인해 IOkrw는 `mint`와 `getParams`만 있고 ERC-20 표현은 별도 주소이며 테스트넷에서 미등록일 뿐이라고 고쳤다.

### 검증 방법

초안마다 검증 에이전트에게 문장 단위로 근거를 묻게 했다. 에이전트 사이에 의견이 갈리는 구간은 내가 RPC나 문서를 직접 열어 확정했다. 그 뒤 가이드를 처음부터 읽으며 문장마다 근거 파일을 확인했고, 내 이해와 다른 문장은 출처를 물은 뒤 직접 들어가 확인했다. 결론을 먼저 세우고 관찰을 맞추지 않기, 대조군 두기, 스크린샷 대신 RPC 원본 남기기, 확신 없는 메커니즘은 미확인으로 적기를 규칙으로 두었다.

### 사람이 직접 판단한 곳

독자를 은행 플랫폼 팀으로 좁히고 활용 사례를 급여 지급으로 정했다. 목차를 문서 요약이 아니라 지급 과정 순서로 재편했다. 먼저 문서와 에이전트로 마루와 x/privacy의 전체 그림을 머릿속에 넣고, 그 그림으로 AI 답변의 참과 거짓을 판단했다. AI가 쓴 문장은 그대로 읽히지 않아 integration-guide.md를 한 줄씩 읽으며 수정을 지시하거나 직접 고쳐 썼다.

## 4. DX Feedback

개발자 마찰 순서다. 재현 근거는 전부 `evidence/`에 있고, 소제목 괄호의 노트 번호는 [docs/documentation-improvement-notes.md](docs/documentation-improvement-notes.md)의 항목 번호다.

### 4.1 [높음] 테스트넷에서 Privacy 흐름을 완주할 수 없다 (개선 노트 2, 4번)

- 재현: `node evidence/testnet-privacy/privacy-deposit-probe.mjs`. 더미 인자 deposit은 commitment 형식 검사에서, canonical commitment를 주면 envelope domain tag 검사에서 거절된다. 문서 예제의 `buildDepositWitness`는 어디에도 정의가 없다. withdraw는 입력 검증을 지나면 kakaoIdHash attestation 정책에 거절된다. 2026년 9월 4일 kyc-testnet.maroo.io에서 카카오 인증을 받은 뒤에는 EAS 검사를 지나 chainId 검증(`maroo-testnet-1` 요구)에서 거절된다(`evidence/testnet-privacy/evidence/privacy-deposit-probe-after-kyc.txt`).
- 영향: 외부 개발자는 마루의 핵심 차별점을 테스트넷에서 한 번도 실행하지 못한다. 이 과제의 Privacy 검증이 로컬 Clairveil로 간 이유다.
- 제안: 회로 산출물과 prover CLI 또는 REST를 공개하고, KYC (mock) 페이지가 발급하는 스키마와 정책의 관계를 문서에 적고, 기관 테스트 지갑용 발급 경로를 연다.

### 4.2 [높음] 문서가 안내하는 ERC-20 표현 주소가 조용히 성공한다 (개선 노트 3번)

- 재현: `evidence/testnet-precompile/evidence/okrw-erc20-check.txt`의 대조군 호출과 `erc20-transfer-probe.txt`의 실제 전송 2회. `transfer`가 status 1로 성공하고 잔고 변화와 로그가 없다.
- 영향: 테스트가 통과했다고 믿고 넘어간다. revert가 없어 발견에 시간이 든다.
- 제안: 미등록 상태를 문서에 적거나, 등록 전까지 그 주소를 문서에서 뺀다.

### 4.3 [높음] 공식 SDK를 찾을 수 없고, 문서대로 짜면 제거 예정 API로 짜게 된다 (개선 노트 1, 16번)

- 재현: 문서 미러에서 `@maroo-chain/viem` 0건. `npm pack @maroo-chain/viem@0.3.0` 후 `dist/index.d.mts`에서 `@deprecated` 4곳. 문서의 `pclAbi` import 경로 네 가지는 `@maroo-chain/contracts` 0.0.8에 없다.
- 영향: 프록시 배포, revert 디코딩, 정책 인코딩을 직접 짜고, 나중에 조합형으로 마이그레이션한다.
- 제안: SDK 페이지 추가, 템플릿 페이지에 deprecated 표기, ABI 경로 통일.

### 4.4 [중] 정책 거절의 형태가 경로마다 달라 파서가 둘 필요하다 (개선 노트 8, 5번)

- 재현: 프록시 경로는 `EasNoAttestationReceived(address)` 같은 IPcl 커스텀 에러(`pcl-readonly-probe.txt` 5번). Privacy 프리컴파일 경로는 문자열 `Error(no EAS attestation received for sender …)`이고 발신자가 bech32 주소다(`privacy-deposit-probe.txt` 4b). 한도 초과 에러 이름은 문서 세 페이지가 다르다.
- 영향: 백엔드가 커스텀 에러와 문자열 두 형태를 모두 파싱하고, 주소 형식 변환까지 해야 한다.
- 제안: Privacy 경로도 커스텀 에러로 통일하거나, 두 형태를 문서에 나란히 적는다.

### 4.5 [중] 훅 가스와 gasUsed 절반 청구를 모른 채 튜토리얼 코드를 쓰면 실패한다 (개선 노트 10, 9번)

- 재현: `node evidence/testnet-pcl/pcl-tx-trace.mjs`. 가스 한도 500,000인 tx 두 건이 postCall에서 out of gas. 성공 tx는 gasUsed가 정확히 gasLimit의 절반. selector를 비운 정책은 view 호출까지 거절한다(`pcl-readonly-probe.txt` 6번).
- 영향: 튜토리얼에는 가스 한도가 없고, 지갑의 잔고 조회가 정책에 걸려 깨진다.
- 제안: 훅 가스 표와 `estimateGas` 안내, selector 필수 안내를 튜토리얼에 넣는다.

## 5. Known Limitations

- 테스트넷 Privacy deposit을 실행하지 못했다. 비공개 흐름은 로컬 Clairveil v0.4.0으로만 검증했고, Clairveil이 마루 `x/privacy`의 참조 구현이라는 판단은 추정이다.
- PCL과 Privacy를 한 트랜잭션에서 잇는 연동(PolicyOperation value 0 규칙, 프록시 경유 예치의 정책 귀속)은 문서 기준이며 실행하지 못했다.
- 급여 정책 배포 스크립트와 한도 초과 프로브는 `--dry`까지만 확인했다. 한도 초과 에러 이름은 과거 블록 `eth_call` 실측이며 실제 거절 tx 해시는 없다.
- 직원 KYC attestation 발급과 `withdrawWithAuthorization` relayer 경로는 문서 기반 제안이다.
- 로컬 Clairveil의 가스 수치는 Cosmos 트랜잭션 가스이며 마루 EVM 가스와 다르다.
- 로컬 relayer 출금은 v0.4.0 원본에서 실패해 리포의 패치를 적용해야 재현된다.
- 메인넷은 확인하지 못했다.
- 마루의 프리컴파일과 어댑터 코드가 비공개라 가이드 8장의 세 층 설명은 문서와 Clairveil 인터페이스에서 추론했다.
