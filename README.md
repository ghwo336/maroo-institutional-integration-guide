# Maroo 기관 통합 가이드: 기밀 급여 지급

Hashed Open Finance, Maroo Network DevRel 과제 Track A(Explain) 제출물이다. 은행 플랫폼 팀이 기업 고객에게 급여 지급 서비스를 제공한다는 활용 사례 하나로 OKRW, PCL(Programmable Compliance Layer), Privacy(`x/privacy`) 세 primitive를 한 트랜잭션 흐름 안에서 설명한다. 독자는 EVM, Solidity, TypeScript, JSON-RPC에 익숙하지만 마루와 ZK 프라이버시는 처음인 시니어 엔지니어다. 문서와 영상은 한국어다.

## 5분 안에 보기

1. [docs/integration-guide.md](docs/integration-guide.md)를 읽는다.아키텍처 다이어그램 1개, 시퀀스 다이어그램 1개, PCL 프록시 흐름도 1개, 노트 상태 전이도 1개. 3장의 아키텍처 표와 5장의 가시성 표, 6장의 키 표로 구성되어 있다.
2. 실행 경로는 [recipe/03-privacy-local](recipe/03-privacy-local/README.md)이다. 로컬 Clairveil 체인에서 예치, 증명 하나로 직원 셋에게 지급, 직원 노트 스캔, relayer 출금, 감사와 기업 대사를 명령 하나로 돈다.
3. 가이드의 모든 주장은 [evidence/README.md](evidence/README.md)의 표에서 직접 검증, 문서 확인, 공개 패키지 확인, 제안으로 구분된다.

## 산출물

| 항목                            | 경로                                                                               | 내용                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Institutional Integration Guide | [docs/integration-guide.md](docs/integration-guide.md)                             | 문제, 세 primitive와 경계, 급여 지급 6단계, 데이터 가시성, 키와 서비스 책임, 실패 모드, Clairveil과 프로덕션 과제, 알려진 제약                              |
| Runnable Integration Recipe     | [recipe/](recipe/README.md)                                                        | `01-okrw`(테스트넷 읽기와 전송), `02-pcl`(테스트넷 정책 읽기, 시뮬레이션, 급여 정책 배포 스크립트), `03-privacy-local`(로컬 Clairveil 급여 흐름 TypeScript) |
| Technical Walkthrough Video     | [youtu.be/ACoUWrFL74g](https://youtu.be/ACoUWrFL74g), [video/](video/README.md)     | 은행 시니어 엔지니어에게 하는 아키텍처 리뷰. 아키텍처, 급여 지급 과정, 로컬 Clairveil 실행 경로 순서                                                       |
| Institutional FAQ               | [docs/faq.md](docs/faq.md)                                                         | prover privacy, 감사 가능성, 키 관리, PCL 연동, disclosure, 재시도, 업그레이드, 프로덕션 준비도 8개                                                         |
| Documentation Improvement Notes | [docs/documentation-improvement-notes.md](docs/documentation-improvement-notes.md) | 심각도순 21건. 위치, 현상, 재현, 영향, 제안                                                                                                                 |
| Submission Notes                | [SUBMISSION_NOTES.md](SUBMISSION_NOTES.md)                                         | 가정과 차이, 검증 기록, AI 사용, DX 피드백, 알려진 제약                                                                                                     |
| 검증 기록                       | [evidence/](evidence/README.md)                                                    | 직접 실행한 스크립트와 원본 출력. 독자용이 아니라 근거용                                                                                                    |
| 다이어그램 소스                 | [docs/diagrams/](docs/diagrams/)                                                   | mermaid 소스와 PNG. 가이드에 넣지 않은 단계별 시퀀스 다이어그램 포함                                                                                        |

## 검증 범위

| 급여 지급 단계                     | primitive    | 검증 환경                                                                        | 근거                           |
| ---------------------------------- | ------------ | -------------------------------------------------------------------------------- | ------------------------------ |
| 자금 준비                          | OKRW         | 마루 테스트넷 직접 검증                                                          | `evidence/testnet-precompile/` |
| 정책 설정                          | PCL          | 마루 테스트넷 직접 검증. 한도 초과 에러 이름은 과거 블록 eth_call로 실측. 정책 배포 스크립트는 `--dry`까지만     | `evidence/testnet-pcl/`        |
| 예치, 일괄 지급, 스캔, 출금, 감사  | Privacy      | 로컬 Clairveil v0.4.0 직접 검증                                                  | `evidence/local-privacy/`      |
| 테스트넷 Privacy 프리컴파일        | Privacy      | 존재와 입력 검증, 정책 거절까지만 직접 검증. 증명 재료가 미공개라 예치 완주 불가 | `evidence/testnet-privacy/`    |
| 직원 KYC attestation, relayer 출금 | EAS, Privacy | 문서 확인                                                                        | 가이드 본문에 표기             |

PCL과 Privacy를 한 트랜잭션에서 잇는 연동은 Clairveil에 PCL이 없고 테스트넷은 증명 재료를 주지 않아 실행하지 못했다. 이 간극이 가이드 8장과 알려진 제약의 중심이다.

## 빠른 실행

개인키 없이 테스트넷에서 실행한다.

```bash
cd recipe && npm install
node 01-okrw/okrw.mjs
cd 02-pcl && node read-policies.mjs && node simulate.mjs
```

로컬 Privacy 흐름은 Clairveil 빌드가 필요하다. 절차는 [recipe/03-privacy-local/README.md](recipe/03-privacy-local/README.md)에 있다.

```bash
node recipe/03-privacy-local/privacy-payroll.ts
```

## 환경

- 마루 테스트넷 chainId 450815, RPC `https://rpc-testnet.maroo.io`, 익스플로러 `https://explorer-testnet.maroo.io`
- Clairveil v0.4.0, commit `ca85b02708fdd75259d4d2ee2d671c21198cec69`, Go 1.26.4
- Node 24, ethers v6, `@maroo-chain/contracts` 0.0.8. 참고한 SDK `@maroo-chain/viem` 0.3.0
- docs.maroo.io 146페이지를 2026년 9월 2일에 미러링해 기준으로 삼았다. 미러는 리포에 넣지 않았다
- 상세는 [evidence/local-privacy/VERSIONS.md](evidence/local-privacy/VERSIONS.md)
