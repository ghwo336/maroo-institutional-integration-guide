# 기관 FAQ: 기밀 급여 지급

은행 플랫폼 팀이 급여 지급 PoC를 시작하기 전에 묻는 질문 여덟 개다. 답의 근거는 세 가지로 구분한다. 직접 검증은 2026년 9월 2일부터 4일 사이에 테스트넷이나 로컬 Clairveil에서 실행한 것이고, 근거 파일은 `evidence/`에 있다. 문서 확인은 docs.maroo.io에서만 읽은 것이다. 제안은 문서에 없는 배치나 설계 판단이다. 한 답 안에 셋이 섞이면 문장 단위로 표기한다.

## 1. prover privacy: prover는 무엇을 보고, 어디에 두어야 하는가

prover는 급여의 평문을 전부 본다. 직원별 금액, 수취인 shielded 주소, 노트 난수, 머클 경로가 입력이고, 출력은 증명과 commitment와 암호화 사본이다. 체인에는 출력만 올라가므로 밸리데이터가 아는 것은 예치 총액, 이체가 있었다는 사실과 출력 개수, 출금액과 출금 공개 주소다. 로컬 Clairveil에서 직원 셋에게 보낸 일괄 이체의 tx 본문에 금액과 수취인이 없고 출력 개수 4만 있는 것을 확인했다(직접 검증, `evidence/local-privacy/evidence/recipe-2-batch-query.json`).

prover는 기업 내부에 둔다. 은행이 prover를 서비스로 제공하면 외부 관찰자와 밸리데이터로부터의 프라이버시는 남지만 은행으로부터의 기밀성은 사라진다. 은행이 직원별 금액을 못 본다는 것은 이 설계가 정한 속성이므로, 외부 prover를 쓴다면 그 prover를 급여 평문에 접근하는 trusted component로 취급해야 한다. Clairveil은 prover가 CLI 안에 내장되어 있어 deposit 증명 생성이 M시리즈 맥에서 20ms다(직접 검증). 마루 테스트넷은 2026년 9월 3일 기준 회로 산출물과 prover를 공개하지 않았으므로, PoC 단계에서 prover 배치는 로컬 Clairveil로 설계하고 마루 산출물이 공개되면 해시를 고정해 교체한다(제안).

prover가 숨기지 못하는 것이 하나 있다. 시점이다. 예치 직후 같은 금액이 출금되면 외부 관찰자가 예치와 출금을 이어 붙일 수 있다. 직원 지갑이 분할 출금과 지연 출금을 지원하도록 설계한다(제안).

## 2. 감사 가능성: 감사자는 사후에 무엇을 복원할 수 있고, 무엇은 못 하는가

모든 비공개 이체에는 audit master key로 암호화한 송신자, 수신자, 금액 사본이 강제로 붙는다. 사본이 없으면 체인이 이체를 거부한다(문서 확인). 감사자는 이벤트 로그의 사본을 모아 자기 키로 복호화하고, 복호화 결과의 digest가 온체인 값과 같은지 검증한다. 로컬에서 일괄 이체의 출력 네 개 전부를 감사 키로 풀어 4, 5, 6, 5uclair와 송신자, 수신자를 복원했고 넷 다 Verified였다(직접 검증, `evidence/local-privacy/evidence/recipe-5-audit-report.json`).

감사자가 못 하는 것은 셋이다. 첫째, 실명. 감사 사본에는 shielded 주소만 있다. 실명은 은행이 KYC 때 받아 둔 shielded 주소 목록과 대조해야 하며, 이 목록은 은행이 보관하고 감사자 요청 시 제공한다(제안). 둘째, 차단. 감사자는 읽기만 하고 이체를 막거나 되돌리지 못한다. 사전 차단은 PCL의 몫이다. 셋째, 선택적 열람. 키 하나로 체인의 모든 이체가 열리므로 특정 기업만 보는 위임이 없다. 감사 키의 교체 절차는 문서에 없다.

## 3. 키 관리: 은행이 들어야 하는 키와 들지 말아야 하는 키

은행이 드는 키는 넷이다. PCL admin(정책 변경), 프록시 admin(급여 컨트랙트 구현 교체), EAS attester(KYC attestation 발급과 revoke), relayer(직원 대신 출금 실행과 가스 지불). 넷을 서로 다른 지갑으로 분리하고 앞의 둘은 멀티시그로 둔다(제안). PCL admin이 새면 `changeContractPolicies` 한 번으로 검사가 전부 사라지므로 정책 변경 이벤트를 감시한다. relayer 키는 새도 가스 자금만 잃는다. 출금은 직원의 EIP-712 서명이 있어야 하고 서명에 제출자 주소와 만료 시각이 들어가므로 relayer가 직원 몰래 출금을 만들 수 없다(문서 확인).

은행이 들지 않는 키는 셋이다. audit master key는 감사자가 든다. 은행이 감사 키까지 들면 급여 전부를 볼 수 있는 단일 주체가 된다. 기업 spend 키는 기업이, 직원 spend 키와 view 키는 직원 지갑이 든다. 은행은 직원 shielded 주소 목록만 보관한다(제안).

기업에는 회차마다 필요한 금액만 예치하라고 안내한다. 기업 spend 키가 새면 풀 안 잔액이 통째로 위험해지는데, 풀 안에서는 PCL의 금액 한도가 걸리지 않기 때문이다.

## 4. PCL 연동: 급여 컨트랙트에 정책을 붙일 때 순서와 함정

순서는 셋이다. 급여 컨트랙트를 보통처럼 배포한다. PCL 프리컴파일의 `deployPclProxy(impl)`를 불러 프록시를 만들고 호출한 주소가 정책 admin이 된다. `changeContractPolicies(proxy, admin, policies)`로 규칙을 붙인다. 기업 지갑에 알려 주는 주소는 프록시다. 구현 주소를 직접 부르면 정책이 평가되지 않는다(직접 검증, `evidence/testnet-pcl/evidence/pcl-readonly-probe.txt` 7번). 절차와 스크립트는 `recipe/02-pcl/`에 있다.

함정은 다섯이다.

- selector를 비우면 view 호출까지 거절된다. attestation 없는 지갑의 `name()`과 `from` 없는 `balanceOf`가 revert했다(직접 검증, 같은 파일 6번). 지갑과 익스플로러의 잔고 조회가 그런 호출이다. 급여 규칙은 `pay()` selector에만 붙인다.
- 풀 안 이체는 PolicyOperation의 value가 0으로 기록되어 금액 정책이 걸리지 않는다(문서 확인). 은행의 금액 한도는 예치 시점에만 작동한다. 직원별 상한을 두려면 기업 쪽 급여 시스템에서 검사한다(제안).
- `eth_call`은 컨트랙트 정책만 평가하고 전역 정책은 평가하지 않는다. 잔고를 state override로 준 임의 주소가 2,000만 tOKRW를 보내는 `eth_call`이 통과했다(직접 검증, 같은 파일 10번). 전역 한도는 `globalPeriodicVolume`을 읽어 백엔드가 비교한다.
- 훅 가스가 크다. preCall 281,696, postCall 287,583이고 가스 한도 500,000인 트랜잭션은 postCall에서 out of gas로 실패했다(직접 검증, `evidence/testnet-pcl/evidence/pcl-proxy-tx-trace.txt`). 가스 한도는 `estimateGas` 결과를 쓴다.
- 문서의 급여 템플릿 `OKRW_EAS_TRANSFER_LIMIT_POLICY`와 `OKRW_EAS_PERIODIC_VOLUME_LIMIT_POLICY`는 마루 SDK `@maroo-chain/viem` 0.3.0이 deprecated로 표기하고 `policy.or(volume 또는 periodicVolume, eas)` 조합형을 권한다(공개 패키지 확인, `evidence/testnet-pcl/evidence/maroo-viem-0.3.0-readme.txt`). 새로 짜는 정책은 조합형으로 한다.

은행이 못 하는 것도 있다. Privacy 프리컴파일 주소에 붙은 정책은 마루 policyAdmin의 것이라 은행이 바꾸지 못한다(직접 검증, `evidence/testnet-pcl/evidence/privacy-address-policies.txt`).

## 5. disclosure: 기업의 대사, 직원의 증빙, 발행자가 대신 예치하는 변형

이체 출력마다 사본이 세 종류 붙는다. 수취인 사본은 직원 view 키로, 감사 사본은 audit master key로 풀리고, self-view 사본은 송신자가 자기 키로 암호화해 붙이는 선택 사본이다(문서 확인. 마루 요청 구조체의 self-view disclosure 필드).

기업의 대사는 self-view 사본으로 한다. 로컬에서 기업 키로 네 출력 전부를 풀어 감사 결과와 같은 금액과 수취인을 얻었다(직접 검증, `evidence/local-privacy/evidence/recipe-6-self-view-report.json`). 기업이 볼 수 없는 것은 직원의 출금 여부다. 출금의 nullifier는 기업 노트와 연결되지 않는다.

직원의 증빙은 수취인 사본으로 한다. 직원 view 키로 풀면 자기 출력만 Verified로 복원되고 다른 직원 출력은 NotPresent다(직접 검증, `recipe-6-recipient-report.json`). 복원 결과의 digest가 온체인 값과 일치하므로 대출 심사처럼 제3자에게 급여를 보일 때 이 결과를 제시할 수 있다. view 키 자체를 넘기면 과거와 미래의 모든 수령이 열리므로 결과만 넘긴다(제안).

배당처럼 발행사나 은행이 기업 대신 예치하고 이체하는 변형에서는 self-view 사본이 실제 송신 키에 붙는다. 대사 능력이 기업이 아니라 송신자에게 간다. 기업이 직접 대사해야 하면 기업 키로 송신하게 하거나, 송신자가 self-view 복호화 결과를 기업에 넘기는 절차를 둔다(제안).

## 6. 재시도: 이체가 실패하거나 응답이 없을 때 다시 보내도 되는가

조건부로 된다. 실패한 트랜잭션은 nullifier를 기록하지 않으므로, 증명이 참조한 머클 루트가 아직 유효하고 위임 서명의 deadline이 지나지 않았을 때만 같은 payload를 다시 보낸다. 아니면 최신 루트로 다시 준비하거나 다시 서명받는다. 성공한 트랜잭션을 다시 보내면 nullifier가 이미 있어 input note is spent로 거절되므로 이중 지급이 생기지 않는다(Clairveil 코드 기준. 재제출 자체를 실행해 보지는 않았다). 일괄 이체는 전체 성공 아니면 전체 롤백이라 직원 일부만 받는 상태가 없다.

운영 규칙은 셋이다. receipt를 확인하기 전에는 재전송하지 않는다. 입력 노트의 nullifier를 멱등 키로 삼아 백엔드가 같은 지급을 두 번 준비하지 않게 한다(제안). 증명 생성과 제출 사이에 노트 트리가 바뀌면 머클 루트 불일치로 실패하므로 최신 루트로 다시 준비한다.

출금의 재시도는 서명 만료에 걸린다. 직원의 EIP-712 서명에는 deadline이 있어 지나면 다시 서명받아야 한다(문서 확인). relayer가 죽었을 때 직원이 가스를 가졌다면 직접 `withdraw`를 부를 수 있다.

로컬 Clairveil v0.4.0에서는 일괄 이체 다음의 relayer 출금이 머클 루트 스냅샷 재등록 결함으로 실패했다. `recipe/03-privacy-local/patches/`의 패치로 넘겼다(직접 검증, `evidence/local-privacy/README.md`).

## 7. 업그레이드: 급여 컨트랙트, 정책, 회로를 각각 바꿀 때 무엇이 남고 무엇이 깨지는가

세 층이 따로 움직인다.

급여 컨트랙트 구현을 바꿔도 정책은 프록시 주소에 묶여 남는다. `contractPolicies(proxy)`가 프록시 기준으로 답하는 것을 확인했다(직접 검증, `evidence/testnet-pcl/evidence/pcl-readonly-probe.txt`). 구현 교체는 프록시 admin 키의 일이고 PCL admin과 다른 지갑으로 둔다.

정책 변경은 `changeContractPolicies`가 배열 전체를 교체한다. 규칙 하나를 고칠 때도 전부 다시 보내므로, 백엔드가 현재 정책을 읽어 diff를 만들고 변경 이벤트를 감시한다(제안). 문서의 융합 템플릿은 SDK가 코어에서 제거 예정이라 표기했으므로 조합형으로 옮기는 마이그레이션을 PoC 일정에 넣는다.

회로와 검증키 교체는 체인 업그레이드다. 기존 노트가 새 회로에서 계속 쓰이는지는 마루가 공지해야 하고 문서에 아직 없다. 공지 전에는 풀 안 잔액을 회차 단위로 최소로 유지한다(제안). 프리컴파일 ABI는 `@maroo-chain/contracts` 버전을 고정하고 공지가 있을 때만 올린다. Clairveil v0.4.0은 artifact 체크섬을 `clairveil.env`에 두고 노드 기동 시 strict 모드로 검사하므로, 마루도 같은 방식이면 은행 배포 파이프라인이 해시를 고정하면 된다(직접 검증은 로컬만).

## 8. 프로덕션 준비도: 오늘 PoC를 시작하면 어디까지 되고, 마루에 무엇을 확인해야 하는가

2026년 9월 4일 기준으로 되는 것은 셋이다. OKRW 잔고와 전송은 테스트넷에서 된다. PCL 프록시 배포, 정책 바인딩, `eth_call` 시뮬레이션은 테스트넷에서 된다. Privacy의 예치, 일괄 이체, 스캔, relayer 출금, 감사와 self-view 복호화는 로컬 Clairveil에서 된다.

안 되는 것은 셋이다. 테스트넷 Privacy 예치는 증명 재료가 공개되지 않아 완주할 수 없고, 재료가 있어도 Privacy 주소의 kakaoIdHash attestation 정책에 걸린다(직접 검증, `evidence/testnet-privacy/evidence/privacy-deposit-probe.txt`). 그 attestation은 kyc-testnet.maroo.io의 카카오 개인 인증으로만 받을 수 있다(2026년 9월 4일 직접 인증, `evidence/testnet-pcl/evidence/kyc-testnet-attestation.txt`). PCL과 Privacy의 연동은 Clairveil에 PCL이 없어 실습할 수 없다. 메인넷 RPC 호스트는 DNS에서 풀리지 않았다.

프로덕션 전에 마루에 서면으로 확인할 항목은 열 개다.

1. 기관 지갑이 전역 정책과 Privacy 주소 정책의 kakaoIdHash attestation을 면제받거나 별도 attestation을 받는 경로. 테스트넷의 발급 경로는 카카오 개인 인증 1인 1지갑뿐이다.
2. 회로 산출물과 prover의 공개 일정, 배포 해시.
3. Groth16 trusted setup 세레모니의 참여자와 공개 기록.
4. 프리컴파일, 어댑터, 회로의 외부 감사 보고서.
5. audit master key의 교체 절차와 교체 시 과거 사본의 취급.
6. 일괄 이체 최대 출력 수 파라미터 값. Clairveil은 32이고 마루는 값을 공개하지 않았다.
7. withdraw가 전역 주기 한도에 포함되는지.
8. 원화와 OKRW 사이의 발행 신청과 상환 절차, 온램프와 오프램프 주체.
9. 코어 버전 표기와 SDK 타겟 버전의 대응. SDK README는 v0.8.0을 타겟한다고 적었다.
10. OKRW ERC-20 표현 주소의 테스트넷 등록 시점.

이 목록의 근거와 재현 방법은 `docs/documentation-improvement-notes.md`에 있다.
