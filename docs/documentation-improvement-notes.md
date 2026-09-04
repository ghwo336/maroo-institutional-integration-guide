# Documentation Improvement Notes

docs.maroo.io를 따라 급여 지급 흐름을 구현하면서 문서와 실제가 다르거나, 문서에 없어서 막힌 지점을 모았다. 기준은 2026년 9월 2일에 미러링한 문서 146페이지와 2026년 9월 2일부터 4일까지의 테스트넷, 로컬 Clairveil, npm 패키지 확인이다. 문체나 구성에 대한 의견은 넣지 않았다. 개발자가 시간을 잃는 곳, 잘못 이해할 수 있는 곳, 확인에 비용이 드는 곳만 다룬다.

심각도는 네 단계로 구성한다.

- 높음: 문서대로 하면 완주하지 못하거나, 곧 사라질 API로 짜게 된다.
- 중: 문서와 실제가 달라 원인을 찾는 데 시간이 든다.
- 낮음: 링크, 표기, 예제 코드 수준.
- 제안: 문서에 없어서 기관이 마루에 따로 물어야 하는 내용.

각 항목은 위치, 현상, 재현 방법, 영향, 제안 순서다. 재현 방법의 파일은 [evidence/](../evidence/)에 있고 실행 명령은 각 폴더의 README에 있다.

## 1. [높음] 공식 SDK가 문서에 없고, 문서의 정책 템플릿을 SDK는 deprecated로 표기한다

- 위치: 문서 전체. PCL 튜토리얼과 API 페이지 전부.
- 현상: npm에 `@maroo-chain/viem` 0.3.0이 2026년 9월 1일 게시되어 있다. npm 게시자가 문서가 안내하는 `@maroo-chain/contracts`와 같고, 메타데이터의 저장소 주소 `Hashed-Open-Finance/maroo-typescript-sdk`는 2026년 9월 4일 기준 비공개라 소스는 볼 수 없다. 프록시 배포, 정책 변경, 사전 시뮬레이션, revert 디코딩, 정책 빌더를 제공하고 README가 Maroo v0.8.0을 타겟한다고 명시한다. 문서 146페이지에 이 패키지 언급이 없다. 같은 패키지의 타입 정의는 `OKRW_EAS_TRANSFER_LIMIT_POLICY`와 `OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY`를 네 곳에서 `@deprecated`로 표기하고 코어에서 제거 예정(slated for removal from core)이라 쓴다. 대체는 `policy.or(policy.volume(...), policy.eas(...))`와 `policy.or(policy.periodicVolume(...), policy.eas(...))`다. 문서의 템플릿 페이지 두 개는 이 두 템플릿을 가장 일반적인 프로덕션 패턴이라고 소개한다.
- 재현: `npm view @maroo-chain/viem time`으로 게시일, `npm pack @maroo-chain/viem@0.3.0`으로 받은 `dist/index.d.mts`에서 `@deprecated` 검색. 발췌는 [maroo-viem-0.3.0-deprecated.txt](../evidence/testnet-pcl/evidence/maroo-viem-0.3.0-deprecated.txt), README 원문은 [maroo-viem-0.3.0-readme.txt](../evidence/testnet-pcl/evidence/maroo-viem-0.3.0-readme.txt). 문서 미러에서 `grep -rl "@maroo-chain/viem"` 0건.
- 영향: 문서만 보고 정책을 짜는 모든 개발자. 지금 문서대로 PoC를 만들면 코어 업그레이드 때 정책 마이그레이션을 해야 한다. SDK가 있는 줄 몰라 프록시 배포와 revert 파싱을 직접 짜게 된다.
- 제안: 템플릿 페이지 두 개 상단에 deprecated 표기와 조합형 대체를 넣는다. SDK 설치와 정책 빌더 사용법 페이지를 추가하고 튜토리얼의 수동 ABI 인코딩을 SDK 호출로 바꾼다. 문서에 코어 버전 표기를 두어 SDK의 타겟 버전과 맞춘다.

## 2. [높음] Privacy deposit 예제를 외부 개발자가 완주할 수 없다

- 위치: https://docs.maroo.io/apis/contract/contract-privacy-deposit 와 Privacy 절 전체.
- 현상: 예제가 `buildDepositWitness`로 commitment, 암호화 노트, 증명을 만드는데 이 함수는 어디에도 정의되어 있지 않다. 증명키와 검증키, prover 라이브러리, 노트 트리를 읽는 REST 엔드포인트가 공개되어 있지 않다. 테스트넷 프리컴파일은 존재하고 아홉 개 메서드에 응답하지만, 증명 재료가 없어 입력 검증을 넘길 수 없다.
- 재현: [privacy-deposit-probe.txt](../evidence/testnet-privacy/evidence/privacy-deposit-probe.txt). 더미 인자 deposit은 commitment 형식 검사에서 거절되고, withdraw는 입력 검증을 지나 정책 단계에서 거절된다. 문서 미러에서 `buildDepositWitness` 정의 검색 0건.
- 영향: Privacy를 평가하려는 모든 기관. 테스트넷에서 비공개 흐름을 한 번도 돌려 볼 수 없다. 이 가이드는 참조 구현 Clairveil을 로컬에서 돌려 대신했지만 Clairveil에는 EVM과 PCL이 없어 프리컴파일 경로는 검증되지 않는다.
- 제안: 증명 artifact와 prover 패키지를 공개하거나, 공개 전까지는 페이지 상단에 현재 외부에서 실행할 수 없다는 상태와 예정 시점을 적는다. 예제의 `buildDepositWitness`를 실제 패키지 함수로 바꾸거나 placeholder임을 명시한다.

## 3. [높음] OKRW ERC-20 표현 주소가 테스트넷에 등록되어 있지 않다

- 위치: https://docs.maroo.io/concepts/core/okrw-precompile-overview, https://docs.maroo.io/resources/contracts/deployed-contracts, https://docs.maroo.io/concepts/core
- 현상: 문서가 `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`를 OKRW의 ERC-20 표현으로 안내한다. 테스트넷에서 이 주소는 `balanceOf`에 빈 응답을 주고, `transfer`는 status 1로 성공 처리되지만 잔고 변화가 없고 로그도 없다. 조용히 성공하므로 잔고를 대조하기 전에는 알 수 없다.
- 재현: [okrw-erc20-check.txt](../evidence/testnet-precompile/evidence/okrw-erc20-check.txt). 대조군으로 IOkrw `getParams`(응답 있음)와 임의 빈 주소(빈 응답)를 같이 호출했다. 실제 전송 2회 [erc20-transfer-probe.txt](../evidence/testnet-precompile/evidence/erc20-transfer-probe.txt), tx `0x5906df5b49c3cbf43e08087f115b15f2efe5e27ca177251ef92e516499738616`(9월 2일), `0x945b19026312375c4bc7f9208ee46c38707d3f8db59ee90116ddcd0df676f0e0`(9월 3일). gasUsed 21,632, 이벤트 0.
- 영향: ERC-20 인터페이스로 OKRW를 다루려는 모든 통합. `approve`와 `transferFrom` 기반 설계가 테스트넷에서 동작하지 않는다. 원인은 코어가 비공개라 확인하지 못했다.
- 제안: 세 페이지에 테스트넷 등록 상태를 적는다. 등록 전까지는 네이티브 value 경로만 안내한다. 미등록 주소 호출이 실패 대신 조용히 성공하는 동작 자체도 설명이 필요하다.

## 4. [중] 테스트넷 Privacy 주소에 kakaoIdHash 정책이 붙어 있다는 사실이 문서에 없다

- 위치: https://docs.maroo.io/concepts/privacy/privacy-policy-aware-precompile
- 현상: 페이지는 Privacy 주소에 바인딩되는 컨트랙트 정책의 예로 denylist만 든다. 테스트넷에서 `contractPolicies(0x…0b)`를 읽으면 EAS_POLICY(스키마 `0x3e44…527d`, `bytes32 kakaoIdHash, uint8 version`, selector 없음)와 DENYLIST_POLICY가 붙어 있고 admin은 마루 policyAdmin이다. 이 attestation이 없는 지갑은 deposit, transfer, withdraw 전부 거절된다. 거절 형태도 문서와 다르다. 페이지는 `EasAttestationRequired(sender)` 커스텀 에러라 쓰지만 실제는 문자열 `Error(no EAS attestation received for sender (index returned empty): maroo1…)`이고 발신자가 bech32 주소로 나온다.
- 발급 경로: 문서에서 이 스키마의 attestation을 받는 방법은 testnet-access 페이지의 표 한 줄(KYC (mock) `https://kyc-testnet.maroo.io`)과 할 수 있는 것 목록 한 줄(mock KYC 서비스를 통한 KYC attestation 흐름)뿐이고, 그 서비스가 어떤 스키마를 발급하며 어느 정책과 연결되는지는 어디에도 없다. 2026년 9월 4일 그 페이지에서 지갑을 연결하고 카카오 인증을 하니 스키마 `0x3e44…527d` attestation이 발급되었고, 같은 지갑의 withdraw가 EAS 거절을 지나 다음 검증(chainId)으로 넘어갔다. 카카오 개인 로그인이고 1인 1지갑이다.
- 재현: [privacy-address-policies.txt](../evidence/testnet-pcl/evidence/privacy-address-policies.txt), [privacy-deposit-probe.txt](../evidence/testnet-privacy/evidence/privacy-deposit-probe.txt) withdraw 항목, [kyc-testnet-attestation.txt](../evidence/testnet-pcl/evidence/kyc-testnet-attestation.txt), [privacy-deposit-probe-after-kyc.txt](../evidence/testnet-privacy/evidence/privacy-deposit-probe-after-kyc.txt) 4b.
- 영향: 증명 재료가 있어도 외부 지갑은 테스트넷 Privacy를 쓸 수 없다. 백엔드가 커스텀 에러만 파싱하면 이 거절을 못 읽는다.
- 제안: 테스트넷 Privacy 주소의 현재 정책을 적고, KYC (mock) 페이지가 바로 이 스키마를 발급한다는 사실을 privacy 페이지에서 연결한다. 기관 지갑용 발급 경로를 적는다. 프리컴파일 경로의 거절이 문자열로 오는 경우를 실패 표면 표에 추가한다.

## 5. [중] withdraw 코인 문자열과 chainId가 문서 예제와 실제가 다르다 (`aokrw` 대 `atokrw`, `maroo-testnet` 대 `maroo-testnet-1`)

- 위치: denom은 문서 전체 86곳. chainId는 https://docs.maroo.io/apis/contract/contract-privacy-withdraw, contract-privacy-withdraw-with-authorization, concepts/privacy/privacy-authorization-eip712-domain.
- 현상: 문서는 최소 단위 denom을 `aokrw`로 쓴다. 테스트넷 IOkrw `getParams`의 mintDenom은 `atokrw`이고 문서에 `atokrw`는 한 번도 없다. 표기 차이로 끝나지 않는다. 문서의 withdraw 예제대로 amount를 `…aokrw`로 주면 `Error(privacy precompile only supports native denom "atokrw", got "aokrw")`로 거절된다. withdraw 요청의 `chainId` 필드도 같다. 문서 예제는 `maroo-testnet`, EIP-712 도메인 페이지는 EVM chain ID 450815라 쓰지만, 프리컴파일은 Cosmos chain-id `maroo-testnet-1`을 요구한다. 450815를 주면 `Error(withdraw chain id mismatch: expected maroo-testnet-1, got 450815)`로 거절된다(2026년 9월 4일, attestation을 받은 지갑으로 확인).
- 재현: `grep -o aokrw reference/*.md | wc -l` 86, `atokrw` 0. [okrw-erc20-check.txt](../evidence/testnet-precompile/evidence/okrw-erc20-check.txt)의 `getParams`, [privacy-deposit-probe.txt](../evidence/testnet-privacy/evidence/privacy-deposit-probe.txt) 4b, [privacy-deposit-probe-after-kyc.txt](../evidence/testnet-privacy/evidence/privacy-deposit-probe-after-kyc.txt) 4b.
- 영향: 코인 문자열을 받는 모든 호출(withdraw amount, 정책의 token 필드)에서 문서 예제를 복사하면 실패한다.
- 제안: 테스트넷과 메인넷의 denom과 Cosmos chain-id를 표로 명시하고 예제를 네트워크별로 나눈다. EIP-712 도메인의 chainId(EVM 숫자)와 withdraw 요청의 chainId(Cosmos 문자열)가 다르다는 점을 한 줄로 적는다.

## 6. [중] 컨트랙트 정책 최초 바인딩을 누구나 할 수 있다고 쓰지만 실제는 프록시 배포가 필요하다

- 위치: https://docs.maroo.io/concepts/compliance/pcl-contract-admin-binding, https://docs.maroo.io/guides/integration/tutorial-building-compliant-token 6단계, https://docs.maroo.io/apis/contract/pcl-update-contract-policy
- 현상: 세 페이지가 `changeContractPolicies`를 upsert로 설명하며 미등록 주소에는 누구든 최초 설정을 만들 수 있다고 쓴다. 실제로는 `deployPclProxy`를 거치지 않은 주소에 호출하면 `ContractPolicyNotRegistered`로 거절된다. reason-codes 페이지만 프록시 배포 경로를 거쳐야 한다고 맞게 쓴다.
- 재현: [pcl-readonly-probe.txt](../evidence/testnet-pcl/evidence/pcl-readonly-probe.txt) 9번.
- 영향: 기존 컨트랙트에 정책을 붙이려는 개발자가 revert 원인을 찾느라 시간을 쓴다. 정책은 프록시 배포 시점에 결정된다는 설계 사실이 가려진다.
- 제안: 세 페이지의 upsert 서술을 지우고 프록시 배포가 선행 조건임을 적는다.

## 7. [중] 비admin의 정책 변경 에러 이름이 문서와 다르다

- 위치: https://docs.maroo.io/apis/contract/pcl-update-contract-policy, https://docs.maroo.io/concepts/compliance/pcl-reason-codes
- 현상: admin이 아닌 주소가 `changeContractPolicies`를 부르면 문서는 `PolicyAlreadyRegistered`라 쓰지만 실제는 `Unauthorized()`다. 없는 templateId도 문서는 `PolicyNotRegistered`, 실제는 `UnknownPolicyType(id)`다.
- 재현: 같은 파일 9번.
- 영향: 에러 이름으로 분기하는 백엔드가 잘못된 케이스를 잡는다.
- 제안: reason-codes 표를 실제 IPcl 에러로 맞추고 각 에러가 나오는 조건을 한 줄씩 적는다.

## 8. [중] 한도 초과 에러 이름이 세 페이지에서 다르다

- 위치: https://docs.maroo.io/concepts/compliance/pcl-reason-codes (`ReachedLimitOfNonEAS`), https://docs.maroo.io/concepts/compliance/pcl-template-okrw-eas-transfer-limit-policy (`ExceededAgentTransferLimit`), https://docs.maroo.io/apis/contract/contract-pcl-post-call (`VolumeAboveMaxLimit`)
- 현상: `OKRW_EAS_TRANSFER_LIMIT_POLICY` 초과 시 에러를 세 페이지가 다르게 적는다. IPcl.sol에는 셋 다 정의되어 있다. 실제 응답은 `ReachedLimitOfNonEAS(limit, amount)`라 reason-codes 페이지만 맞다(2026년 9월 4일 실측). 같은 방법으로 `OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY` 초과는 `ExceededPeriodicVolume(max, amount, resetAt)`이었다. `@maroo-chain/viem` 0.3.0의 디코더도 셋을 각각 non-eas-limit, agent-transfer-limit, volume-above-max로 다른 위반으로 분류한다.
- 재현: [limit-error-probe.mjs](../evidence/testnet-pcl/limit-error-probe.mjs). 테스트넷에 두 템플릿이 차례로 바인딩됐던 프록시 `0x65Ba…B88e`에 블록 17217688과 17217690을 지정한 `eth_call`을 미인증 주소(잔고 state override)로 보냈다. 한도 위 금액은 preCall 프레임에서 위 에러로 되돌려진다. 출력 [limit-error-probe.txt](../evidence/testnet-pcl/evidence/limit-error-probe.txt), SDK 분류 [maroo-viem-0.3.0-revert-map.txt](../evidence/testnet-pcl/evidence/maroo-viem-0.3.0-revert-map.txt). 은행 지갑이 직접 배포한 프록시의 실제 거절 tx는 개인키가 필요한 [payout-limit-probe.mjs](../evidence/testnet-pcl/payout-limit-probe.mjs)로 만들 수 있으며 미실행이다.
- 영향: 에러 이름으로 사용자 안내를 분기하는 지갑과 백엔드.
- 제안: 템플릿 페이지와 postCall 페이지를 reason-codes와 맞추고, 실제 발생 에러를 테스트넷 트랜잭션 해시와 함께 적는다.

## 9. [중] selector 없는 정책이 view 호출까지 거절한다는 사실이 문서에 없다

- 위치: https://docs.maroo.io/concepts/compliance/pcl-policy-structure 의 PolicySet 설명과 튜토리얼.
- 현상: `selector`를 비우면 모든 호출에 적용된다고만 쓴다. 실제로는 `name()`, `balanceOf` 같은 view 호출도 프록시를 거치면 정책 평가를 받아, attestation 없는 주소의 `name()`이 revert하고 `from` 없이 보낸 `eth_call`은 zero address로 평가되어 `EasNoAttestationReceived(0x0)`가 된다.
- 재현: [pcl-readonly-probe.txt](../evidence/testnet-pcl/evidence/pcl-readonly-probe.txt) 5번, 6번.
- 영향: 지갑과 익스플로러의 잔고 조회가 깨진다. 튜토리얼대로 selector 없이 바인딩한 토큰은 attestation 없는 사용자에게 잔고가 안 보인다.
- 제안: PolicySet 설명에 view 호출도 대상이라는 문장과 `from` 생략 시 동작을 적고, 튜토리얼은 자금 이동 함수의 selector만 바인딩하는 예제로 바꾼다.

## 10. [중] 프록시 훅 가스와 gasUsed 최소 청구를 문서가 언급하지 않는다

- 위치: https://docs.maroo.io/guides/integration/tutorial-building-compliant-token, https://docs.maroo.io/concepts/compliance/pcl-proxy-hook
- 현상: 프록시 경유 전송은 preCall 약 28만, postCall 약 29만 가스가 추가된다. gasLimit 50만으로 보낸 트랜잭션 두 건이 postCall에서 out of gas로 실패했다. 성공한 트랜잭션은 gasUsed가 정확히 gasLimit의 절반으로 기록되어, 실사용과 무관하게 최소 절반이 청구되는 것으로 보인다. 튜토리얼 코드에는 가스 한도가 없다.
- 재현: [pcl-proxy-tx-trace.txt](../evidence/testnet-pcl/evidence/pcl-proxy-tx-trace.txt). callTracer 4건과 익스플로러 최근 50건 중 10건의 절반 청구 표본. 절반 청구의 원인은 feemarket 파라미터로 추정하며 REST 엔드포인트가 없어 확인하지 못했다.
- 영향: 가스 한도를 고정한 클라이언트가 실패하고, 가스 비용 견적이 두 배 이상 틀린다.
- 제안: 훅 가스 측정치와 `estimateGas` 사용을 튜토리얼에 넣고, 최소 청구 규칙을 네트워크 파라미터 페이지에 적는다.

## 11. [중] `eth_call`이 전역 정책을 평가하지 않는다

- 위치: https://docs.maroo.io/guides/integration/simulating-pcl-checks, https://docs.maroo.io/concepts/compliance/pcl-dual-track-model
- 현상: 두 페이지가 `eth_call` 시뮬레이션이 전역과 컨트랙트 범위를 모두 평가한다고 쓴다. 잔고를 state override로 넣은 임의 주소가 전역 단건 상한 200만을 넘는 2,000만 tOKRW를 보내는 `eth_call`이 통과하고 `estimateGas`도 21,000이다. 전역 정책은 AnteHandler에서 평가되어 `eth_call` 경로에 없다.
- 재현: [pcl-readonly-probe.txt](../evidence/testnet-pcl/evidence/pcl-readonly-probe.txt) 10번. 실제 트랜잭션 거절은 그만한 잔고가 없어 확인하지 못했다.
- 영향: 사전 시뮬레이션만 믿는 백엔드가 전역 한도 초과를 놓친다.
- 제안: 시뮬레이션 범위를 컨트랙트 정책으로 한정해 적고, 전역 한도는 `globalPolicies`와 `globalPeriodicVolume`을 읽어 클라이언트가 비교하라고 안내한다.

## 12. [중] 프리컴파일이 네 개라는 서술에 Privacy가 빠져 있다

- 위치: https://docs.maroo.io/resources/contracts/deployed-contracts (두 곳), https://docs.maroo.io/apis/contract, https://docs.maroo.io/concepts/core/maroo-architecture (세 곳), concepts/core와 apis 목차 페이지, guides/integration/building-maroo-contracts
- 현상: 네 개의 마루 프리컴파일이라고 쓰고 목록에 Privacy `0x1000…000b`가 없다. deployed-contracts 페이지에는 그 주소가 한 번도 나오지 않는다. 테스트넷에서 이 주소는 아홉 개 메서드에 응답한다.
- 재현: `grep -c 0x100000000000000000000000000000000000000b` 결과 deployed-contracts 0건. [privacy-deposit-probe.txt](../evidence/testnet-privacy/evidence/privacy-deposit-probe.txt).
- 영향: 주소 목록을 코드에 고정하는 개발자가 Privacy 주소를 빠뜨린다.
- 제안: 목록을 다섯 개로 갱신하고 EAS 보조 주소(0x…06, 07, 08, 09)를 함께 표로 둔다.

## 13. [중] 익스플로러에서 OKRW를 검색하면 무관한 토큰이 나온다

- 위치: https://docs.maroo.io/resources/network/testnet-access 와 익스플로러 안내.
- 현상: 익스플로러 토큰 검색에 OKRW라는 이름의 테스트 ERC-20 두 개(`0x7AD397C817180A374cED6891E21e37d2392371F1`, `0xBc82cb9E57d8BE55f27844EBa5Cddf392f944517`)가 나온다. 네이티브 OKRW는 토큰 목록에 없다. 문서에 구분 안내가 없다.
- 재현: 익스플로러 토큰 검색. RPC 원본이 아니라 리포에는 캡처를 넣지 않았다.
- 영향: 처음 접하는 개발자가 테스트 토큰을 OKRW로 오인한다.
- 제안: 네이티브 OKRW는 토큰 목록에 없다는 문장과 잔고 확인 방법(`eth_getBalance`)을 적는다.

## 14. [중] 테스트넷 전역 정책 값과 면제 attestation의 발급 경로 설명이 문서에 없다

- 위치: https://docs.maroo.io/resources/network/testnet-access
- 현상: 테스트넷 전역 정책은 단건 200만 tOKRW, 24시간 누적 1,000만 tOKRW이고 스키마 `bytes32 kakaoIdHash, uint8 version` attestation이 있으면 면제된다. 문서에 이 값이 없고, 발급 경로는 같은 페이지의 표 한 줄(KYC (mock) `https://kyc-testnet.maroo.io`)과 목록 한 줄(mock KYC 서비스를 통한 KYC attestation 흐름)뿐이며 어떤 스키마를 발급하는지 설명이 없다. 2026년 9월 4일 그 페이지에서 카카오 인증을 하니 이 스키마의 attestation이 발급되었다. 카카오 개인 로그인이고 1인 1지갑이다.
- 재현: [pcl-readonly-probe.txt](../evidence/testnet-pcl/evidence/pcl-readonly-probe.txt) 3번, [recipe-read-policies.txt](../evidence/testnet-pcl/evidence/recipe-read-policies.txt), [kyc-testnet-attestation.txt](../evidence/testnet-pcl/evidence/kyc-testnet-attestation.txt).
- 영향: 기관 테스트 지갑이 200만 초과 트랜잭션을 보내면 이유를 모른 채 거절된다. 기관 지갑은 카카오 개인 인증을 쓸 수 없으므로 면제 경로가 없다.
- 제안: 테스트넷 접속 페이지에 전역 정책 값을 적고, KYC (mock) 링크 옆에 발급되는 스키마와 면제 효과를 적는다. 기관 지갑의 면제 신청 방법을 적는다.

## 낮음과 제안

| 번호 | 심각도 | 위치                                                                                                | 현상                                                                                                                                                                   | 제안                                  |
| ---- | ------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 15   | 낮음   | 5페이지 6곳                                                                                            | `/apis/contract/contract-okrw-mint`(실제 `okrw-mint`)와 `/concepts/identity/agent-precompile-overview`(실제 `/concepts/agents/`) 링크 404                              | 링크 수정                             |
| 16   | 낮음   | pcl-reason-codes, pcl-update-contract-policy, pcl-get-contract-policy, pcl-template-denylist-policy | `pclAbi`를 `@maroo-chain/contracts`, `/abi`, `/abis`, `/IPcl.sol`에서 import. 패키지 0.0.8의 실제 경로는 `@maroo-chain/contracts/abi/precompiles/pcl/IPcl`의 `iPclAbi` | 네 페이지 통일, 또는 1번의 SDK로 교체 |
| 17   | 낮음   | pcl-template-eas-policy                                                                             | EAS와 Indexer 주소를 하드코딩한 예제. 같은 페이지가 `getParams` 조회를 권장                                                                                            | 예제를 `getParams` 기반으로           |
| 18   | 낮음   | contract-pcl-post-call, pcl-reason-codes, 템플릿 페이지 2개                                         | `ExceededAgentTransferLimit`를 에이전트 한도와 OKRW_EAS 한도에 재사용해 원인 구분이 안 됨                                                                              | 에러별 발생 정책 명시                 |
| 19   | 낮음   | contract-pcl-proxy, pcl-proxy-hook                                                                  | 한 페이지는 V1에서 Transparent만, 다른 페이지는 Transparent와 UUPS 지원. IPcl.sol enum에는 UUPS가 있고 테스트넷 실측은 Transparent만                                   | 지원 범위 한 곳에서 확정              |
| 20   | 제안   | apis/contract 전반                                                                                  | 프리컴파일은 `eth_getCode`가 `0x`이고 익스플로러에 EOA로 보인다. 살아 있는지 확인하는 방법(호출해 데이터나 revert 확인)이 없다                                         | 확인 절차 한 단락                     |
| 21   | 제안   | concepts/core/okrw, x/okrw                                                                          | 원화와 OKRW 사이 발행 신청, 상환, 온램프와 오프램프 주체가 없다. 미러에서 상환, 환매, redeem, onramp, offramp 검색 0건                                                 | 기관용 전환 절차 페이지               |

## 재현 환경

- 테스트넷 RPC `https://rpc-testnet.maroo.io`, chainId 450815. 실행 스크립트와 명령은 [evidence/testnet-pcl/README.md](../evidence/testnet-pcl/README.md), [evidence/testnet-precompile/](../evidence/testnet-precompile/), [evidence/testnet-privacy/](../evidence/testnet-privacy/).
- 로컬 Clairveil v0.4.0(commit `ca85b02`). 버전은 [evidence/local-privacy/VERSIONS.md](../evidence/local-privacy/VERSIONS.md).
- npm `@maroo-chain/viem` 0.3.0, `@maroo-chain/contracts` 0.0.8.
