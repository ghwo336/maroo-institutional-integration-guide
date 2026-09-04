// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/// 기업이 OKRW를 넣어 직원에게 지급하는 최소 구조. 컴플라이언스 코드는 없다.
/// PCL 프록시 뒤에 두면 호출마다 preCall/postCall이 감싼다.
contract Payout {
    event Paid(address indexed from, address indexed to, uint256 amount);

    /// 호출자가 msg.value로 자금을 대고 수취인에게 바로 보낸다.
    function pay(address payable to) external payable {
        (bool ok, ) = to.call{value: msg.value}("");
        require(ok, "send failed");
        emit Paid(msg.sender, to, msg.value);
    }

    /// 상태를 바꾸지 않는 조회. 정책이 view 호출에도 걸리는지 보는 용도.
    function version() external pure returns (string memory) {
        return "payout-1";
    }
}
