# Recipe

가이드 4장 급여 지급 여정의 각 절을 독자가 직접 실행해 보는 예제다. 각 폴더의 README는 사전 요구 사항, 입력값, 예상 결과, 확인 방법, 오류 처리 순서로 쓴다. 예상 결과는 `evidence/` 아래의 실행 기록을 가리킨다.

| 폴더 | 가이드 절 | 환경 |
| --- | --- | --- |
| `01-okrw/` | 4.1 자금 준비 | 마루 테스트넷 |
| `02-pcl/` | 4.2 정책 설정 | 마루 테스트넷 (읽기 전용, 개인키 불필요) |
| `03-privacy-local/` | 4.3 예치와 비공개 지급, 4.4 수령과 출금, 4.5 감사 | 로컬 Clairveil |

## 공통 사전 요구 사항

- Node 24, ethers v6
- 마루 테스트넷 RPC `https://rpc-testnet.maroo.io`, chainId 450815
- 로컬 Clairveil은 `03-privacy-local/README.md`의 절차로 설치한다
