import { InMemoryWalletCreditStore } from "../../settlement/wallet-credit-store.js";
import { runWalletCreditStoreContract } from "./wallet-credit-store.contract.js";

runWalletCreditStoreContract("InMemoryWalletCreditStore", () => new InMemoryWalletCreditStore());
