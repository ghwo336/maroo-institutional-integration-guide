# evidence: 직접 실행한 검증 기록

호재가 2026년 9월 2일과 3일에 직접 실행한 검증의 스크립트와 출력이다. 독자가 따라 하는 예제는 `recipe/`에 있고, 이 폴더는 가이드의 직접 검증 표기와 SUBMISSION_NOTES의 Validation이 가리키는 근거다.

| 폴더 | 환경 | 내용 |
| --- | --- | --- |
| `testnet-precompile/` | 마루 테스트넷 | OKRW ERC-20 표현 주소 `0xEeee…EEeE`의 등록 여부. 대조군 포함 balanceOf 응답 비교와 transfer 실제 전송 2회. 전송 스크립트 `erc20-probe.mjs`(키는 환경 변수 `PRIVATE_KEY`) |
| `testnet-privacy/` | 마루 테스트넷 | Privacy 프리컴파일에 더미 인자로 deposit과 withdraw를 시도한 기록. 입력 검증 단계의 정확한 에러와, withdraw가 kakaoIdHash 정책에 거절되는 모습 |
| `testnet-pcl/` | 마루 테스트넷 | PCL 프리컴파일 읽기 전용 검증, 기존 프록시 tx 4건의 callTracer, 과거 블록 eth_call로 한도 초과 에러 이름 실측, 개인키가 필요한 한도 정책 프로브(미실행), npm 패키지 `@maroo-chain/viem` 0.3.0의 README와 revert 디코더 발췌. 상세는 [testnet-pcl/README.md](testnet-pcl/README.md) |
| `local-privacy/` | 로컬 Clairveil v0.4.0 | deposit, 일괄 이체, 노트 스캔, relayed withdraw, 감사와 self-view 복호화 출력. 상세는 [local-privacy/README.md](local-privacy/README.md), 버전은 [local-privacy/VERSIONS.md](local-privacy/VERSIONS.md) |

## 가이드 주장별 검증 상태

가이드 본문의 핵심 주장을 출처별로 나눈 표다. 표시가 없는 서술은 docs.maroo.io 기준이고, 직접 검증은 위 폴더의 파일이 근거다.

| 주장 | 구분 | 근거 |
| --- | --- | --- |
| `getParams` 응답 minter `0x83cb…f63f`, mintDenom `atokrw` | 직접 검증 | `testnet-precompile/`, `../recipe/01-okrw` |
| EAS 프리컴파일 `getParams`가 schemaRegistry `0x…06`, eas `0x…07`, indexer `0x…08`을 돌려줌 | 직접 검증 | `testnet-pcl/evidence/eas-get-params.txt` |
| ERC-20 표현 주소 미등록, `transfer`가 효과 없이 성공 | 직접 검증 | tx `0x5906…8616`, `0x945b…f0e0` |
| PCL 템플릿 9개, 전역 정책 단건 200만, 24시간 1,000만 tOKRW | 직접 검증 | `testnet-pcl/evidence/pcl-readonly-probe.txt` |
| selector 없는 정책은 view 호출도 거절, `from` 생략은 zero address | 직접 검증 | 같은 파일 |
| `changeContractPolicies` 에러 네 종류 | 직접 검증 | 같은 파일 |
| `eth_call`은 전역 정책 미평가 | 직접 검증 | 같은 파일 |
| Privacy 주소에 EAS_POLICY(kakaoIdHash)와 DENYLIST_POLICY가 바인딩, admin은 마루 policyAdmin | 직접 검증 | `testnet-pcl/evidence/privacy-address-policies.txt` |
| 프록시 훅 가스와 postCall out of gas, gasUsed 절반 청구 | 직접 검증 | `testnet-pcl/evidence/pcl-proxy-tx-trace.txt` |
| 로컬 deposit, 일괄 이체, 스캔, 감사와 self-view 복호화 | 직접 검증 | `local-privacy/evidence/` |
| Privacy 프리컴파일 존재와 메서드 9개, 더미 인자 deposit과 withdraw의 정확한 거절 사유 | 직접 검증 | `testnet-privacy/evidence/privacy-deposit-probe.txt` |
| Privacy withdraw는 입력 검증을 지나면 kakaoIdHash attestation 정책에 거절된다. 에러는 문자열 Error이고 발신자가 bech32 주소로 표시 | 직접 검증 | 같은 파일 4b |
| kyc-testnet.maroo.io의 카카오 인증이 kakaoIdHash 스키마 attestation을 발급한다. 문서에는 testnet-access 표의 KYC (mock) 한 줄뿐 | 직접 검증 (2026-09-04) | `testnet-pcl/evidence/kyc-testnet-attestation.txt` |
| attestation을 받은 지갑의 withdraw는 EAS 검사를 지나 chainId 검증에서 거절된다. 요구값은 Cosmos chain-id `maroo-testnet-1`, EVM 450815가 아님 | 직접 검증 (2026-09-04) | `testnet-privacy/evidence/privacy-deposit-probe-after-kyc.txt` 4b |
| 증명 재료 미공개, 메인넷 RPC 미해결 | 직접 검증 | 문서 미러 검색, DNS 조회 |
| 비공개 이체의 PolicyOperation은 value 0 | 문서 확인 | concepts/privacy/privacy-policy-aware-precompile |
| `withdrawWithAuthorization`의 relayer 실행 | 문서 확인 | apis/contract/contract-privacy-withdraw-with-authorization |
| audit master key 제네시스 등록과 감사 사본 강제 | 문서 확인. 로컬은 직접 검증 | concepts/privacy, `transfer-private-audit-report.json` |
| `@maroo-chain/viem` 0.3.0(2026-09-01 게시)이 OKRW_EAS 융합 템플릿을 deprecated로 표기하고 조합형을 권함. 문서에는 미기재 | 공개 패키지 확인 | `testnet-pcl/evidence/maroo-viem-0.3.0-readme.txt`, 문서 미러 검색 0건 |
| OKRW_EAS_TRANSFER_LIMIT_POLICY 초과는 `ReachedLimitOfNonEAS(limit, amount)`, OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY 초과는 `ExceededPeriodicVolume(max, amount, resetAt)` | 직접 검증(2026-09-04, 과거 블록 eth_call) | `testnet-pcl/evidence/limit-error-probe.txt` |
| 한도 초과 에러 세 이름을 SDK 디코더가 non-eas-limit, agent-transfer-limit, volume-above-max로 분류 | 공개 패키지 확인 | `testnet-pcl/evidence/maroo-viem-0.3.0-revert-map.txt` |
| 은행이 relayer와 PCL admin 운영, 키 넷 분리, 감사 키 독립 | 제안 | |
| push 구조, selector 한정 바인딩, value 기반 정산, deposit 시점 한도 통제 | 제안 | 관찰에 따른 판단 |
| 직원 지갑의 분할·지연 출금 | 제안 | 가시성 분석에 따른 판단 |
