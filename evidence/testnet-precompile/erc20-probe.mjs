import { ethers } from "ethers";

const rpc = "https://rpc-testnet.maroo.io";
const provider = new ethers.JsonRpcProvider(rpc);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const ERC20 = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const to = process.env.TO;
const amount = ethers.parseEther("1");

const iface = new ethers.Interface(["function transfer(address,uint256) returns (bool)"]);
const data = iface.encodeFunctionData("transfer", [to, amount]);

console.log("experiment: ERC-20 transfer(to, 1 tOKRW) call to", ERC20);
console.log("from:", wallet.address, " to:", to);

const before = await provider.getBalance(to);
console.log("to balance before:", ethers.formatEther(before));

const gas = await provider.estimateGas({ from: wallet.address, to: ERC20, data });
console.log("estimateGas:", gas.toString());

const tx = await wallet.sendTransaction({ to: ERC20, data });
console.log("tx hash:", tx.hash);
const rc = await tx.wait();
console.log("status:", rc.status, " gasUsed:", rc.gasUsed.toString(), " logs:", rc.logs.length, " block:", rc.blockNumber);

const after = await provider.getBalance(to);
console.log("to balance after :", ethers.formatEther(after));
console.log("delta:", ethers.formatEther(after - before));
