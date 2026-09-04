```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'fontSize': '18px'}, 'flowchart': {'nodeSpacing': 30, 'rankSpacing': 45}}}%%
flowchart TB
  subgraph OFF["오프체인: 기업과 은행 운영 환경"]
    HR["급여 시스템<br/>지급 명세 생성"]
    CORP["기업 지갑<br/>EVM 키 + shielded 키"]
    PROVER["Prover<br/>note · commitment · proof"]
    BANK["은행 백엔드<br/>PCL 정책 관리 · Relayer"]
    KYC["KYC 서비스<br/>EAS attester"]
  end
  subgraph ON["온체인: Maroo L1"]
    ANTE["AnteHandler (Cosmos)<br/>전역 PCL 정책"]
    PROXY["급여 컨트랙트<br/>PCL 프록시"]
    PRIV["Privacy 0x…0b<br/>deposit · transfer · withdraw"]
    PCL["PCL 0x…05<br/>preCall / postCall"]
    EAS["EAS 0x…07<br/>Indexer 0x…08"]
    XPRIV["x/privacy (Cosmos)<br/>머클 트리 · nullifier · escrow"]
    BANKM["bank · x/okrw (Cosmos)<br/>OKRW 잔고"]
    IDX["이벤트 로그 · 인덱서"]
  end
  subgraph EMP["직원 환경"]
    EW["직원 지갑<br/>view/spend 키 · 노트 스캔"]
  end
  subgraph AUD["감사자 환경"]
    AUDITOR["감사 시스템<br/>audit master key"]
  end
  HR --> CORP
  CORP <-- "증명 요청 / proof" --> PROVER
  CORP -- "pay() + msg.value<br/>공개 경로" --> PROXY
  CORP -- "deposit(msg.value)<br/>singleProofBatchTransfer" --> PRIV
  BANK -- "정책 바인딩" --> PCL
  BANK -- "relay 실행" --> PRIV
  KYC -- "attestation 발급" --> EAS
  ANTE -. "모든 tx 사전 검사" .-> PROXY
  ANTE -. "모든 tx 사전 검사" .-> PRIV
  PROXY -- "preCall / postCall" --> PCL
  PRIV -- "PolicyOperation" --> PCL
  PCL -- "attestation 조회" --> EAS
  PRIV --> XPRIV
  XPRIV --> BANKM
  PRIV -- "commitment · nullifier<br/>암호화 노트 · audit payload" --> IDX
  IDX -- "노트 스캔" --> EW
  IDX -- "audit payload 복호화" --> AUDITOR
  EW -- "withdrawWithAuthorization 서명" --> BANK
  style OFF fill:#2a2418,stroke:#d4a24c,stroke-width:1.5px,color:#e8eef7
  style EMP fill:#17301f,stroke:#3fb37f,stroke-width:1.5px,color:#e8eef7
  style AUD fill:#2a1f3a,stroke:#a78bfa,stroke-width:1.5px,color:#e8eef7
  style ON fill:#16233a,stroke:#5b9cf6,stroke-width:1.5px,color:#e8eef7
  linkStyle default stroke:#8ab4f8,stroke-width:1.5px
  classDef box fill:#1b2838,stroke:#8ab4f8,stroke-width:1.5px,color:#e8eef7
  class ANTE,AUDITOR,BANK,BANKM,CORP,EAS,EW,HR,IDX,KYC,PCL,PRIV,PROVER,PROXY,XPRIV box
```

범례
- 실선: 마루 문서 기준 호출 경로. 굵은 표시 없음.
- 점선: 트랜잭션이 EVM에 닿기 전 단계(AnteHandler).
- 직접 검증한 것: Privacy → x/privacy 내부 동작(로컬 Clairveil), PCL 프록시 → PCL 정책 평가(테스트넷), EAS 주소 조회(테스트넷).
- 문서로만 확인한 것: Privacy → PCL PolicyOperation 연동, withdrawWithAuthorization relay 경로.
- 제안: 은행이 Relayer와 PCL admin을 함께 운영하는 배치. 마루가 강제하는 구조가 아님.
