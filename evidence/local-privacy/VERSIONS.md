# 사용 버전 기록

과제 문서 6.1 규칙에 따라 작업에 사용한 버전을 기록한다.

## Clairveil (로컬 x/privacy 참조 구현)

- repo: https://github.com/DELIGHT-LABS/clairveil
- commit: ca85b02708fdd75259d4d2ee2d671c21198cec69
- tag: v0.4.0 (2026-08-02)
- status: PUBLICATION_READY_EXPERIMENTAL
- 패치: `recipe/03-privacy-local/patches/clairveil-withdraw-snapshot.patch` (원본 commit에 없음)
- Go: 1.26.4 (go.mod 요구 1.25.12)
- 실행일: 단일 deposit과 transfer(`evidence/deposit-*.json`, `transfer-private*.json`) 2026-09-02. recipe 흐름(`evidence/recipe-*.json`) 2026-09-03. recipe 재실행 확인 2026-09-04

## Maroo 테스트넷

- chainId: 450815
- RPC: https://rpc-testnet.maroo.io
- explorer: https://explorer-testnet.maroo.io
- 검증 실행일: 2026-09-02 (OKRW ERC-20 표현), 2026-09-03 (PCL, Privacy 더미 인자, ERC-20 전송 2회차), 2026-09-04 (EAS getParams)
- docs.maroo.io 참조 시점: 2026-09-02 (146페이지 로컬 미러 기준)

## npm (2026-09-03 조회)

- @maroo-chain/contracts: 0.0.8 (recipe와 evidence 스크립트가 쓰는 ABI 패키지. `abi/precompiles/pcl/IPcl`의 `iPclAbi`)
- @maroo-chain/viem: 0.3.0 (2026-09-01 게시. PCL 프록시 배포, 정책 변경, 시뮬레이션, revert 디코더 포함. 2026-09-03 발견, recipe는 ethers + iPclAbi 기준으로 작성됨)
- maroo-contracts: latest 0.0.1, rc 0.0.4 (스코프 없는 별도 패키지. 이 리포에서는 쓰지 않음)
- @maroo-chain/m-aws: 0.2.10
- @maroo-chain/mcp: 0.1.3
- @maroo-chain/agent-wallet-kit: 0.2.1

## 도구와 OS

- macOS (Darwin 25.6.0)
- Node 24.18.0, ethers v6
- Hardhat 3.14 + Ignition (이전 실습 `maru-practice`에서 프록시 배포와 attestation 발급에 사용)
