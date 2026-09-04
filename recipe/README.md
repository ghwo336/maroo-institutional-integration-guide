# Recipe

가이드 4장 급여 지급 과정의 각 절을 독자가 직접 실행해 보는 예제다. 각 폴더의 README는 사전 요구 사항, 입력값, 예상 결과, 확인 방법, 오류 처리 순서로 쓴다. 예상 결과는 `evidence/` 아래의 실행 기록을 가리킨다.

과제의 최소 실행 경로는 [`03-privacy-local`](03-privacy-local/README.md)이다. Clairveil 로컬 체인에서 예치, one proof 일괄 지급, 직원 노트 스캔, relayer 출금, 감사와 기업 대사를 실행한다.

```bash
node recipe/03-privacy-local/privacy-payroll.ts
```

독자가 읽는 예제는 TypeScript 파일 하나다. `node recipe/03-privacy-local/privacy-payroll.ts 2`처럼 한 단계만 다시 실행할 수 있다. 실제 실행 결과와 tx 해시는 [`evidence/local-privacy`](../evidence/local-privacy/README.md)에 있다.

| 폴더 | 가이드 절 | 환경 |
| --- | --- | --- |
| `01-okrw/` | 4.1 자금 준비 | 마루 테스트넷 |
| `02-pcl/` | 4.2 정책 설정 | 마루 테스트넷 (읽기 전용, 개인키 불필요) |
| `03-privacy-local/` | 4.3 예치와 비공개 지급, 4.4 수령과 출금, 4.5 감사 | 로컬 Clairveil |

## 공통 사전 요구 사항

- Node 24
- 이 폴더에서 `npm install` 한 번. ethers v6와 @maroo-chain/contracts 0.0.8이 설치된다
- 마루 테스트넷 RPC `https://rpc-testnet.maroo.io`, chainId 450815
- 로컬 Clairveil은 `03-privacy-local/README.md`의 절차로 설치한다
