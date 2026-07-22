import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESSES,
  MOCK_USDC_ABI,
  VAULT_MANAGER_ABI,
  SAVING_CORE_ABI,
} from "./contracts/config";
import {
  ShieldCheck,
  Wallet,
  PiggyBank,
  Award,
  Lock,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  DollarSign,
  Coins
} from "lucide-react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface SavingPlan {
  id: number;
  tenorDays: number;
  aprBps: number;
  minDeposit: string;
  maxDeposit: string;
  earlyPenaltyBps: number;
  enabled: boolean;
}

interface Deposit {
  id: number;
  planId: number;
  principal: string;
  startAt: number;
  maturityAt: number;
  tenorDays: number;
  aprBpsAtOpen: number;
  penaltyBpsAtOpen: number;
  autoRenew: boolean;
  status: number; // 0: Active, 1: Withdrawn, 2: ManualRenewed, 3: AutoRenewed
}

export function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "plans" | "certificates" | "admin">("dashboard");
  const [account, setAccount] = useState<string>("");
  const [provider, setProvider] = useState<ethers.BrowserProvider | ethers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  
  // Balances & Stats
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [vaultBalance, setVaultBalance] = useState<string>("0");
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [contractPaused, setContractPaused] = useState<boolean>(false);

  // Data Lists
  const [plans, setPlans] = useState<SavingPlan[]>([]);
  const [userDeposits, setUserDeposits] = useState<Deposit[]>([]);

  // Modal / Form States
  const [selectedPlan, setSelectedPlan] = useState<SavingPlan | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Admin Form States
  const [newPlanTenor, setNewPlanTenor] = useState<string>("30");
  const [newPlanApr, setNewPlanApr] = useState<string>("500"); // 5%
  const [newPlanMin, setNewPlanMin] = useState<string>("100");
  const [newPlanMax, setNewPlanMax] = useState<string>("10000");
  const [newPlanPenalty, setNewPlanPenalty] = useState<string>("200"); // 2%
  const [fundVaultAmount, setFundVaultAmount] = useState<string>("1000");

  // Connect Wallet
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await browserProvider.send("eth_requestAccounts", []);
        const currentSigner = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(currentSigner);
        setAccount(accounts[0]);
        showStatus("success", `Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      } else {
        // Fallback to local hardhat provider
        const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const currentSigner = await localProvider.getSigner(0);
        const address = await currentSigner.getAddress();
        setProvider(localProvider);
        setSigner(currentSigner);
        setAccount(address);
        showStatus("info", "Connected to Local Hardhat Node");
      }
    } catch (err: any) {
      showStatus("error", err.message || "Failed to connect wallet");
    }
  };

  const showStatus = (type: "success" | "error" | "info", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Load Contracts Data
  const loadData = async () => {
    if (!account) return;
    try {
      const activeProvider = provider || new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const addrs = CONTRACT_ADDRESSES.localhost;

      // 1. Balances
      const ethBal = await activeProvider.getBalance(account);
      setEthBalance(ethers.formatEther(ethBal));

      const usdcContract = new ethers.Contract(addrs.mockUSDC, MOCK_USDC_ABI, activeProvider);
      const usdcBal = await usdcContract.balanceOf(account);
      setUsdcBalance(ethers.formatUnits(usdcBal, 6));

      const vaultContract = new ethers.Contract(addrs.vaultManager, VAULT_MANAGER_ABI, activeProvider);
      const vBal = await vaultContract.vaultBalance();
      setVaultBalance(ethers.formatUnits(vBal, 6));

      const savingCoreContract = new ethers.Contract(addrs.savingCore, SAVING_CORE_ABI, activeProvider);
      const owner = await savingCoreContract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());

      const paused = await savingCoreContract.paused();
      setContractPaused(paused);

      // 2. Load Plans
      const nextPlanId = await savingCoreContract.nextPlanId();
      const loadedPlans: SavingPlan[] = [];
      for (let i = 0; i < Number(nextPlanId); i++) {
        const plan = await savingCoreContract.getPlan(i);
        loadedPlans.push({
          id: i,
          tenorDays: Number(plan.tenorDays),
          aprBps: Number(plan.aprBps),
          minDeposit: ethers.formatUnits(plan.minDeposit, 6),
          maxDeposit: ethers.formatUnits(plan.maxDeposit, 6),
          earlyPenaltyBps: Number(plan.earlyWithdrawPenaltyBps),
          enabled: plan.enabled,
        });
      }
      setPlans(loadedPlans);

      // 3. Load Deposits
      const nextDepositId = await savingCoreContract.nextDepositId();
      const loadedDeposits: Deposit[] = [];
      for (let i = 0; i < Number(nextDepositId); i++) {
        try {
          const depOwner = await savingCoreContract.ownerOf(i);
          if (depOwner.toLowerCase() === account.toLowerCase()) {
            const dep = await savingCoreContract.getDeposit(i);
            loadedDeposits.push({
              id: i,
              planId: Number(dep.planId),
              principal: ethers.formatUnits(dep.principal, 6),
              startAt: Number(dep.startAt),
              maturityAt: Number(dep.maturityAt),
              tenorDays: Number(dep.tenorDays),
              aprBpsAtOpen: Number(dep.aprBpsAtOpen),
              penaltyBpsAtOpen: Number(dep.penaltyBpsAtOpen),
              autoRenew: dep.autoRenew,
              status: Number(dep.status),
            });
          }
        } catch {
          // Deposit NFT might be burned after withdrawal
        }
      }
      setUserDeposits(loadedDeposits);
    } catch (err: any) {
      console.error("Data load error:", err);
    }
  };

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account, provider]);

  // Mint Mock USDC Faucet
  const mintFaucet = async () => {
    if (!signer) return;
    try {
      setLoading(true);
      const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.mockUSDC, MOCK_USDC_ABI, signer);
      const tx = await usdcContract.mint(account, ethers.parseUnits("1000", 6));
      await tx.wait();
      showStatus("success", "Successfully minted 1,000 mUSDC!");
      loadData();
    } catch (err: any) {
      showStatus("error", err.reason || err.message || "Mint failed");
    } finally {
      setLoading(false);
    }
  };

  // Open Deposit
  const handleOpenDeposit = async () => {
    if (!signer || !selectedPlan || !depositAmount) return;
    try {
      setLoading(true);
      const amountParsed = ethers.parseUnits(depositAmount, 6);
      const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.mockUSDC, MOCK_USDC_ABI, signer);
      const savingCoreContract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.savingCore, SAVING_CORE_ABI, signer);

      // Step 1: Approve
      showStatus("info", "Approving mUSDC transfer...");
      const approveTx = await usdcContract.approve(CONTRACT_ADDRESSES.localhost.savingCore, amountParsed);
      await approveTx.wait();

      // Step 2: Open Deposit
      showStatus("info", "Opening Deposit & Minting NFT Certificate...");
      const depositTx = await savingCoreContract.openDeposit(selectedPlan.id, amountParsed);
      await depositTx.wait();

      showStatus("success", "Deposit opened successfully!");
      setSelectedPlan(null);
      setDepositAmount("");
      loadData();
    } catch (err: any) {
      showStatus("error", err.reason || err.message || "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  // Mature Withdraw
  const handleMatureWithdraw = async (depositId: number) => {
    if (!signer) return;
    try {
      setLoading(true);
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.savingCore, SAVING_CORE_ABI, signer);
      const tx = await contract.withdrawAtMaturity(depositId);
      await tx.wait();
      showStatus("success", "Maturity withdrawal complete! Principal & Interest sent.");
      loadData();
    } catch (err: any) {
      showStatus("error", err.reason || err.message || "Withdraw failed");
    } finally {
      setLoading(false);
    }
  };

  // Early Withdraw
  const handleEarlyWithdraw = async (depositId: number) => {
    if (!signer) return;
    try {
      setLoading(true);
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.savingCore, SAVING_CORE_ABI, signer);
      const tx = await contract.earlyWithdraw(depositId);
      await tx.wait();
      showStatus("success", "Early withdrawal processed (penalty deducted).");
      loadData();
    } catch (err: any) {
      showStatus("error", err.reason || err.message || "Early withdraw failed");
    } finally {
      setLoading(false);
    }
  };

  // Manual Renew
  const handleRenew = async (depositId: number) => {
    if (!signer) return;
    try {
      setLoading(true);
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.savingCore, SAVING_CORE_ABI, signer);
      const tx = await contract.renewDeposit(depositId);
      await tx.wait();
      showStatus("success", "Deposit renewed successfully!");
      loadData();
    } catch (err: any) {
      showStatus("error", err.reason || err.message || "Renewal failed");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Auto Renew
  const toggleAutoRenew = async (depositId: number, currentAuto: boolean) => {
    if (!signer) return;
    try {
      setLoading(true);
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.savingCore, SAVING_CORE_ABI, signer);
      const tx = currentAuto
        ? await contract.disableAutoRenew(depositId)
        : await contract.enableAutoRenew(depositId);
      await tx.wait();
      showStatus("success", `Auto-renew ${currentAuto ? "disabled" : "enabled"}.`);
      loadData();
    } catch (err: any) {
      showStatus("error", err.reason || err.message || "Toggle failed");
    } finally {
      setLoading(false);
    }
  };

  // Admin: Create Plan
  const handleCreatePlan = async () => {
    if (!signer) return;
    try {
      setLoading(true);
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.savingCore, SAVING_CORE_ABI, signer);
      const tx = await contract.createPlan(
        newPlanTenor,
        newPlanApr,
        ethers.parseUnits(newPlanMin, 6),
        ethers.parseUnits(newPlanMax, 6),
        newPlanPenalty
      );
      await tx.wait();
      showStatus("success", "New Saving Plan created!");
      loadData();
    } catch (err: any) {
      showStatus("error", err.reason || err.message || "Create plan failed");
    } finally {
      setLoading(false);
    }
  };

  // Admin: Fund Vault
  const handleFundVault = async () => {
    if (!signer) return;
    try {
      setLoading(true);
      const amountParsed = ethers.parseUnits(fundVaultAmount, 6);
      const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.mockUSDC, MOCK_USDC_ABI, signer);
      const vaultContract = new ethers.Contract(CONTRACT_ADDRESSES.localhost.vaultManager, VAULT_MANAGER_ABI, signer);

      const appTx = await usdcContract.approve(CONTRACT_ADDRESSES.localhost.vaultManager, amountParsed);
      await appTx.wait();

      const fundTx = await vaultContract.fundVault(amountParsed);
      await fundTx.wait();

      showStatus("success", `Vault funded with ${fundVaultAmount} mUSDC!`);
      loadData();
    } catch (err: any) {
      showStatus("error", err.reason || err.message || "Fund vault failed");
    } finally {
      setLoading(false);
    }
  };

  // Stats Calculations
  const totalDeposited = userDeposits
    .filter((d) => d.status === 0)
    .reduce((acc, d) => acc + Number(d.principal), 0);

  const calculateAccruedInterest = (d: Deposit) => {
    return (Number(d.principal) * (d.aprBpsAtOpen / 10000) * d.tenorDays) / 365;
  };

  const totalEstInterest = userDeposits
    .filter((d) => d.status === 0)
    .reduce((acc, d) => acc + calculateAccruedInterest(d), 0);

  return (
    <div style={{ paddingBottom: "60px" }}>
      {/* Top Header */}
      <header className="glass-panel" style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none", padding: "16px 32px", marginBottom: "32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "linear-gradient(135deg, #6366f1 0%, #10b981 100%)", borderRadius: "12px", padding: "10px", display: "flex" }}>
              <ShieldCheck size={28} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 800, background: "linear-gradient(90deg, #fff 0%, #9ca3af 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                CryptoVault Bank
              </h1>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                Decentralized Fixed-Term Savings & Interest Vault {contractPaused && <span className="badge badge-warning">Paused</span>}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {account ? (
              <>
                <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "8px 14px", borderRadius: "10px", fontSize: "13px", border: "1px solid var(--border-color)" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>Balances</div>
                  <div style={{ fontWeight: 700, color: "#10b981" }}>{Number(usdcBalance).toLocaleString()} mUSDC <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({Number(ethBalance).toFixed(3)} ETH)</span></div>
                </div>

                <button onClick={mintFaucet} disabled={loading} className="btn-secondary" style={{ fontSize: "13px" }}>
                  <Coins size={16} /> Faucet (+1,000 mUSDC)
                </button>

                <div style={{ background: "rgba(99, 102, 241, 0.15)", padding: "8px 14px", borderRadius: "10px", fontSize: "13px", border: "1px solid rgba(99, 102, 241, 0.3)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Wallet size={16} color="#818cf8" />
                  <span style={{ fontWeight: 600, color: "#c7d2fe" }}>{account.slice(0, 6)}...{account.slice(-4)}</span>
                </div>
              </>
            ) : (
              <button onClick={connectWallet} className="btn-primary">
                <Wallet size={18} /> Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        {/* Status Alert Banner */}
        {statusMsg && (
          <div className="glass-panel" style={{ padding: "14px 20px", marginBottom: "24px", borderColor: statusMsg.type === "success" ? "#10b981" : statusMsg.type === "error" ? "#ef4444" : "#6366f1", display: "flex", alignItems: "center", gap: "12px" }}>
            {statusMsg.type === "success" && <CheckCircle2 size={20} color="#10b981" />}
            {statusMsg.type === "error" && <AlertTriangle size={20} color="#ef4444" />}
            {statusMsg.type === "info" && <RefreshCw size={20} className="spin" color="#818cf8" />}
            <span style={{ fontSize: "14px", fontWeight: 500 }}>{statusMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
          {[
            { id: "dashboard", label: "Dashboard", icon: TrendingUp },
            { id: "plans", label: "Saving Plans", icon: PiggyBank },
            { id: "certificates", label: `My Certificates (${userDeposits.filter(d => d.status === 0).length})`, icon: Award },
            ...(isOwner ? [{ id: "admin", label: "Admin Panel", icon: Sliders }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={active ? "btn-primary" : "btn-secondary"}
                style={{ padding: "12px 20px", fontSize: "14px" }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            {/* Top Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginBottom: "32px" }}>
              <div className="glass-panel" style={{ padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>
                  <span>Total Deposited Principal</span>
                  <PiggyBank size={20} color="#6366f1" />
                </div>
                <div style={{ fontSize: "28px", fontWeight: 800 }}>${totalDeposited.toLocaleString()}</div>
                <div style={{ fontSize: "12px", color: "#10b981", marginTop: "4px" }}>Active Fixed Deposits</div>
              </div>

              <div className="glass-panel" style={{ padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>
                  <span>Est. Interest Earned</span>
                  <TrendingUp size={20} color="#10b981" />
                </div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#10b981" }}>+${totalEstInterest.toFixed(2)}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Paid upon maturity</div>
              </div>

              <div className="glass-panel" style={{ padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>
                  <span>Vault Reserve Liquidity</span>
                  <Lock size={20} color="#f59e0b" />
                </div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#f59e0b" }}>${Number(vaultBalance).toLocaleString()}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Available for interest payouts</div>
              </div>
            </div>

            {/* Quick Overview Section */}
            <div className="glass-panel" style={{ padding: "32px", marginBottom: "32px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>Fixed Savings Overview</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", maxWidth: "800px", marginBottom: "24px" }}>
                Earn guaranteed interest on your USDC deposits. Upon opening a savings plan, you receive a non-fungible token (ERC721 Certificate) representing your principal and accrued yield. Select a savings plan to begin earning.
              </p>
              <button onClick={() => setActiveTab("plans")} className="btn-primary">
                Explore Saving Plans
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SAVING PLANS */}
        {activeTab === "plans" && (
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "20px" }}>Available Saving Plans</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              {plans.map((plan) => (
                <div key={plan.id} className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <span className="badge badge-active">{plan.tenorDays} Days Tenor</span>
                      <span style={{ fontSize: "24px", fontWeight: 800, color: "#10b981" }}>
                        {(plan.aprBps / 100).toFixed(2)}% APR
                      </span>
                    </div>

                    <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>Plan #{plan.id + 1}</h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Min Deposit:</span>
                        <strong style={{ color: "#fff" }}>${Number(plan.minDeposit).toLocaleString()} mUSDC</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Max Deposit:</span>
                        <strong style={{ color: "#fff" }}>${Number(plan.maxDeposit).toLocaleString()} mUSDC</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Early Penalty:</span>
                        <strong style={{ color: "#ef4444" }}>{(plan.earlyPenaltyBps / 100).toFixed(2)}%</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPlan(plan)}
                    disabled={!plan.enabled || loading}
                    className="btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <PlusCircle size={18} /> Deposit Funds
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MY CERTIFICATES */}
        {activeTab === "certificates" && (
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "20px" }}>My Saving NFT Certificates</h2>
            {userDeposits.filter(d => d.status === 0).length === 0 ? (
              <div className="glass-panel" style={{ padding: "48px", textAlign: "center" }}>
                <Award size={48} color="var(--text-muted)" style={{ marginBottom: "16px" }} />
                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>No Active Saving Certificates</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>You currently don't have any active fixed deposits.</p>
                <button onClick={() => setActiveTab("plans")} className="btn-primary">Open First Deposit</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
                {userDeposits.filter(d => d.status === 0).map((dep) => {
                  const now = Math.floor(Date.now() / 1000);
                  const isMatured = now >= dep.maturityAt;
                  const estInterest = calculateAccruedInterest(dep);

                  return (
                    <div key={dep.id} className="glass-panel" style={{ padding: "28px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#818cf8" }}>Certificate NFT #{dep.id}</span>
                        <span className={isMatured ? "badge badge-active" : "badge badge-warning"}>
                          {isMatured ? "Matured" : "Active & Locked"}
                        </span>
                      </div>

                      <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "16px" }}>
                        ${Number(dep.principal).toLocaleString()}{" "}
                        <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>mUSDC</span>
                      </div>

                      <div style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>APR Rate:</span>
                          <strong>{(dep.aprBpsAtOpen / 100).toFixed(2)}%</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>Yield at Maturity:</span>
                          <strong style={{ color: "#10b981" }}>+${estInterest.toFixed(2)} mUSDC</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>Maturity Date:</span>
                          <strong>{new Date(dep.maturityAt * 1000).toLocaleDateString()}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-muted)" }}>Auto-Rollover:</span>
                          <button
                            onClick={() => toggleAutoRenew(dep.id, dep.autoRenew)}
                            className="btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                          >
                            {dep.autoRenew ? "Enabled ✓" : "Disabled ✗"}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        {isMatured ? (
                          <>
                            <button onClick={() => handleMatureWithdraw(dep.id)} disabled={loading} className="btn-success" style={{ flex: 1 }}>
                              Withdraw All
                            </button>
                            <button onClick={() => handleRenew(dep.id)} disabled={loading} className="btn-primary" style={{ flex: 1 }}>
                              Renew
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleEarlyWithdraw(dep.id)} disabled={loading} className="btn-danger" style={{ width: "100%" }}>
                            Early Withdraw (Penalty Applies)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ADMIN PANEL */}
        {activeTab === "admin" && isOwner && (
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "20px" }}>Contract Administration</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
              {/* Admin Card 1: Fund Interest Vault */}
              <div className="glass-panel" style={{ padding: "28px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <DollarSign size={20} color="#10b981" /> Fund Vault Liquidity
                </h3>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "13px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Amount (mUSDC)</label>
                  <input
                    type="number"
                    value={fundVaultAmount}
                    onChange={(e) => setFundVaultAmount(e.target.value)}
                    className="glass-input"
                  />
                </div>
                <button onClick={handleFundVault} disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Deposit to Interest Vault
                </button>
              </div>

              {/* Admin Card 2: Create Saving Plan */}
              <div className="glass-panel" style={{ padding: "28px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <PlusCircle size={20} color="#6366f1" /> Create Saving Plan
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Tenor (Days)</label>
                    <input type="number" value={newPlanTenor} onChange={(e) => setNewPlanTenor(e.target.value)} className="glass-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>APR (BPS, e.g. 500=5%)</label>
                    <input type="number" value={newPlanApr} onChange={(e) => setNewPlanApr(e.target.value)} className="glass-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Min Deposit (mUSDC)</label>
                    <input type="number" value={newPlanMin} onChange={(e) => setNewPlanMin(e.target.value)} className="glass-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Max Deposit (mUSDC)</label>
                    <input type="number" value={newPlanMax} onChange={(e) => setNewPlanMax(e.target.value)} className="glass-input" />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Early Penalty (BPS, e.g. 200=2%)</label>
                    <input type="number" value={newPlanPenalty} onChange={(e) => setNewPlanPenalty(e.target.value)} className="glass-input" />
                  </div>
                </div>
                <button onClick={handleCreatePlan} disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Create Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Open Deposit */}
      {selectedPlan && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div className="glass-panel" style={{ width: "90%", maxWidth: "460px", padding: "32px" }}>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>Open Fixed Deposit</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>
              Selected: Plan #{selectedPlan.id + 1} ({selectedPlan.tenorDays} Days @ {(selectedPlan.aprBps / 100).toFixed(2)}% APR)
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Deposit Amount (mUSDC)
              </label>
              <input
                type="number"
                placeholder={`Min: $${selectedPlan.minDeposit}`}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="glass-input"
              />
            </div>

            {depositAmount && (
              <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "14px", borderRadius: "10px", marginBottom: "20px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Estimated Maturity Interest:</span>
                  <strong style={{ color: "#10b981" }}>
                    +${((Number(depositAmount) * (selectedPlan.aprBps / 10000) * selectedPlan.tenorDays) / 365).toFixed(2)} mUSDC
                  </strong>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setSelectedPlan(null)} className="btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
                Cancel
              </button>
              <button onClick={handleOpenDeposit} disabled={loading || !depositAmount} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                Confirm & Mint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
