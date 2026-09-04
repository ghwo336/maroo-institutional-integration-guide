# 01-okrw: 자금 준비 (OKRW)

가이드 4.1의 예제다. 마루 테스트넷에서 OKRW 프리컴파일 파라미터, 가스 가격, 잔고를 읽고, 원하면 OKRW를 전송한다. 읽기 부분은 개인키 없이 실행된다.

## 사전 요구 사항

- Node 24
- `recipe/` 폴더에서 `npm install` 한 번 (ethers v6, @maroo-chain/contracts 0.0.8)
- 전송까지 하려면 tOKRW가 있는 지갑. 테스트넷 tOKRW는 `https://faucet.maroo.io`에서 받는다

## 입력값

| 이름                | 방법                               | 기본값                                      |
| ------------------- | ---------------------------------- | ------------------------------------------- |
| 조회할 주소         | 첫 번째 인자 `node okrw.mjs 0x...` | 개인키가 있으면 그 지갑, 없으면 minter 주소 |
| `MAROO_PRIVATE_KEY` | 환경 변수                          | 없음. 없으면 읽기 전용                      |
| `TO`                | 환경 변수, 수취인                  | 없음. 없으면 전송 생략                      |
| `AMOUNT`            | 환경 변수, OKRW 단위               | `1`                                         |
| `MAROO_RPC`         | 환경 변수                          | `https://rpc-testnet.maroo.io`              |

```
cd recipe/01-okrw
node okrw.mjs
MAROO_PRIVATE_KEY=0x... TO=0x... AMOUNT=1 node okrw.mjs
```

## 예상 결과

2026년 9월 3일 테스트넷 실행 출력이다. 잔고 숫자는 실행 시점마다 다르다.

```
chainId: 450815
minter: 0x83cBceF68d5989a30795Ce63C9617Aa93016f63F
mintDenom: atokrw
gasPrice: 9000.0 Gwei
plain transfer cost: 0.189 OKRW
balance of 0x83cBceF68d5989a30795Ce63C9617Aa93016f63F: 986.731889999998585159 OKRW
(전송 생략: MAROO_PRIVATE_KEY와 TO를 주면 실행)
```

전송까지 실행하면 마지막에 tx 해시, status 1, gasUsed 21000, logs 0, 수취인 잔고 증가분이 찍힌다. 네이티브 전송이므로 로그는 0이 정상이다.

## 확인 방법

- `mintDenom`이 `atokrw`인지 본다. 문서에 적힌 `aokrw`가 아니다. 코드에 denom을 적어야 할 때는 이 응답을 쓴다.
- `plain transfer cost`가 가스 가격 × 21,000과 맞는지 본다.
- 전송한 경우 익스플로러에서 tx 해시를 열어 value와 status를 본다. `https://explorer-testnet.maroo.io/tx/<해시>`
- 수취인 잔고 증가분이 `AMOUNT`와 같은지 본다. 발신자는 여기에 가스가 더 빠진다.

## 오류 처리

| 증상                                              | 원인                                                             | 조치                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `Cannot find module '@maroo-chain/contracts/...'` | `recipe/`에서 `npm install`을 안 함                              | `cd recipe && npm install`                                     |
| `insufficient funds`                              | 잔고 부족. 전송액 + 가스 필요                                    | faucet에서 받거나 `AMOUNT`를 줄인다                            |
| `network changed` 또는 chainId 불일치             | RPC가 다른 체인                                                  | `MAROO_RPC`와 chainId 450815 확인                              |
| `UnauthorizedMinter` revert                       | `mint`를 minter가 아닌 주소가 호출                               | 이 예제는 mint를 부르지 않는다. 직접 부르는 코드가 있다면 제거 |
| 전송 tx가 성공했는데 수취인 잔고가 그대로         | 수취인으로 ERC-20 표현 주소 `0xEeee…EEeE`를 썼거나 `TO`가 잘못됨 | 네이티브 전송은 EOA나 payable 컨트랙트로만 보낸다              |
