# local privacy: Clairveil 검증 기록

Clairveil 로컬 체인에서 deposit, private transfer, one proof batch transfer, note scan, relayed withdraw, disclosure 복호화를 실행한 기록이다. 버전은 [VERSIONS.md](VERSIONS.md)에 고정했다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `VERSIONS.md` | Clairveil commit, tag, Go 버전, 실행일 |
| `evidence/deposit-*.json` | 2026년 9월 2일 단일 deposit 실행 |
| `evidence/transfer-private*.json` | 2026년 9월 2일 단일 private transfer와 audit, self view 복호화 |
| `evidence/recipe-1-*.json` | recipe의 20uclair deposit과 전후 노트 |
| `evidence/recipe-2-*.json` | one proof `MsgBatchTransfer`와 `alice` 노트 상태 |
| `evidence/recipe-3-bob-notes.json` | `bob`의 4uclair 노트 스캔 |
| `evidence/recipe-4-*.json` | relayer 출금 준비, 제출, tx 조회, 공개 잔고, 출금 후 노트 |
| `evidence/recipe-5-audit-report.json` | batch 출력 네 개의 audit plane 복호화 |
| `evidence/recipe-6-self-view-report.json` | batch 출력 네 개의 self view plane 복호화 |
| `evidence/recipe-6-recipient-report.json` | `bob`의 recipient plane 복호화 시도 |

## 가이드 4.3, 4.4, 4.5 주장과 근거 위치

| 가이드 주장 | 파일 | 위치 |
| --- | --- | --- |
| 공개 자금을 shielded note 한 개로 예치 | `recipe-1-deposit-query.json` | tx body, events, gas_used |
| 입력 노트 한 개를 소비해 직원 세 명과 거스름돈 출력 생성 | `recipe-2-batch-query.json` | MsgBatchTransfer, input_count, output_count |
| 입력 20uclair 노트가 spent이고 거스름돈 5uclair가 spendable | `recipe-2-alice-notes-after.json` | notes index 6, 7 |
| `bob`이 자기 4uclair 노트를 복구 | `recipe-3-bob-notes.json` | notes index 2 |
| relayer가 소유자 서명에 묶인 출금을 제출 | `recipe-4-withdraw-query.json` | creator, recipient, amount, code, gas_used |
| 출금한 4uclair 노트가 spent | `recipe-4-bob-notes-after.json` | notes index 2 |
| 감사자가 송신자, 수신자, 금액을 복원하고 digest 검증 | `recipe-5-audit-report.json` | outputs 0부터 3 |
| 기업 self view가 감사 결과와 같은 금액을 복원 | `recipe-6-self-view-report.json` | outputs 0부터 3 |
| recipient plane은 `bob`에게 지정한 출력만 복원 | `recipe-6-recipient-report.json` | output 0 Verified, 나머지 NotPresent |

## 실행 중 발견한 차이

Clairveil v0.4.0 원본에서 batch 다음 relayed withdraw는 `merkle root snapshot re-registration is inconsistent`로 실패했다. 실패 tx는 `964581464AC90A8C93635ED1C24B2EBEF6115D5966D4E890BD3BB80A46D90DE8`, `gas_used`는 1,090,994다. withdraw는 commitment를 추가하지 않아 머클 루트가 그대로인데 현재 높이로 같은 snapshot을 등록해서 생긴다.

Recipe의 `patches/clairveil-withdraw-snapshot.patch`는 기존 snapshot의 루트와 leaf count가 같으면 최초 높이를 보존한다. 패치 적용 후 relayed withdraw tx `15A9AA6B5ADDD3397B717B97004396944B0B7424B5815CF667D70EC4AA8D57BE`가 성공했다. 이 패치는 원본 commit에 포함되지 않는다.
