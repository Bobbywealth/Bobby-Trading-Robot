import React, { useState } from "react";
import { Sidebar } from "@/components/trading/Sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plug,
  PlugZap,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react";
import {
  useBrokerStatus,
  useConnectBroker,
  useSelectBrokerAccount,
  useDisconnectBroker,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import generatedImage from "@assets/generated_images/dark_futuristic_digital_trading_background_with_neon_data_streams.png";

interface BrokerAccount {
  id: number;
  name: string;
  accNum: number;
  currency: string;
  balance: number;
  equity: number;
}

export default function ConnectPage() {
  const { toast } = useToast();
  const {
    data: status,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useBrokerStatus();
  const connectMutation = useConnectBroker();
  const selectAccountMutation = useSelectBrokerAccount();
  const disconnectMutation = useDisconnectBroker();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("live.tradelocker.com");
  const [availableAccounts, setAvailableAccounts] = useState<BrokerAccount[]>(
    [],
  );
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [step, setStep] = useState<"login" | "select-account" | "connected">(
    "login",
  );

  const formatNumber = (value: unknown) =>
    typeof value === "number" ? value.toLocaleString() : "--";

  const formatDate = (value?: string | null) => {
    if (!value) return "--";
    const d = new Date(value);
    return isNaN(d.getTime()) ? "--" : d.toLocaleString();
  };

  const handleConnect = async () => {
    if (!email || !password || !server) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await connectMutation.mutateAsync({
        email,
        password,
        server,
      });
      if (result.success && result.accounts.length > 0) {
        setAvailableAccounts(result.accounts);
        setStep("select-account");
        toast({
          title: "Connected to TradeZilla",
          description: `Found ${result.accounts.length} trading account(s)`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to TradeZilla",
        variant: "destructive",
      });
    }
  };

  const handleSelectAccount = async () => {
    if (!selectedAccount) {
      toast({
        title: "Select an account",
        description: "Please select a trading account to continue",
        variant: "destructive",
      });
      return;
    }

    const account = availableAccounts.find(
      (a) => String(a.id) === selectedAccount,
    );
    if (!account) return;

    try {
      await selectAccountMutation.mutateAsync({
        accountId: String(account.id),
        accountNumber: Number(account.accNum),
      });
      setStep("connected");
      toast({
        title: "Account selected",
        description: `Now trading on ${account.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Selection failed",
        description: error.message || "Failed to select account",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      setStep("login");
      setAvailableAccounts([]);
      setSelectedAccount("");
      setEmail("");
      setPassword("");
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from TradeZilla",
      });
    } catch (error: any) {
      toast({
        title: "Disconnect failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isConnected = status?.connected && status?.accountNumber;

  if (statusLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="flex min-h-screen bg-background text-foreground items-center justify-center px-4">
        <Card className="max-w-md w-full border-destructive/30 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Unable to reach server
            </CardTitle>
            <CardDescription>
              {statusError instanceof Error
                ? statusError.message
                : "The server is not responding. Check the backend is running."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => refetchStatus()}
              data-testid="button-retry-status"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      <div
        className="fixed inset-0 z-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url(${generatedImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="z-10 relative">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 overflow-y-auto z-10 relative h-screen">
        <header className="mb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground tracking-wide flex items-center gap-2">
                TRADEZILLA CONTROL <span className="text-muted-foreground">///</span>
              </h1>
              <p className="text-muted-foreground text-sm font-mono">
                TradeZilla x TradeLocker — secure broker connection
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-2xl space-y-6">
          {isConnected ? (
            <Card className="border-primary/30 bg-card/30 backdrop-blur-sm shadow-[0_0_20px_rgba(0,255,128,0.1)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-5 h-5" />
                  Connected to TradeZilla
                </CardTitle>
                <CardDescription>
                  Your trading account is connected and ready for automated
                  trading.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded bg-primary/5 border border-primary/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="font-medium">Status</span>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      ONLINE
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Email</span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {status?.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Server</span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {status?.server}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Account #</span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {status?.accountNumber}
                    </span>
                  </div>
                  {status?.lastConnected && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Last Connected</span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {formatDate(status.lastConnected)}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  className="w-full h-11"
                  disabled={disconnectMutation.isPending}
                  data-testid="button-disconnect"
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plug className="w-4 h-4 mr-2" />
                  )}
                  Disconnect Account
                </Button>
              </CardContent>
            </Card>
          ) : step === "select-account" && availableAccounts.length > 0 ? (
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-accent" />
                  Select Trading Account
                </CardTitle>
                <CardDescription>
                  Choose which trading account to use for automated trading.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Trading Account</Label>
                  <Select
                    value={selectedAccount}
                    onValueChange={setSelectedAccount}
                  >
                    <SelectTrigger data-testid="select-account">
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAccounts.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{account.name}</span>
                            <span className="text-muted-foreground">
                              ({account.currency}{" "}
                              {formatNumber(account.balance)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAccount && (
                  <div className="p-4 rounded bg-muted/30 border border-border/50 space-y-2">
                    {(() => {
                      const account = availableAccounts.find(
                        (a) => String(a.id) === selectedAccount,
                      );
                      if (!account) return null;
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Balance
                            </span>
                            <span className="font-mono">
                              {account.currency}{" "}
                            {formatNumber(account.balance)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Equity
                            </span>
                            <span className="font-mono">
                              {account.currency}{" "}
                            {formatNumber(account.equity)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Account #
                            </span>
                            <span className="font-mono">{account.accNum}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("login");
                      setAvailableAccounts([]);
                    }}
                    className="flex-1"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSelectAccount}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_15px_rgba(0,255,128,0.2)]"
                    disabled={
                      !selectedAccount || selectAccountMutation.isPending
                    }
                    data-testid="button-select-account"
                  >
                    {selectAccountMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Confirm Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlugZap className="w-5 h-5 text-accent" />
                  Connect TradeZilla
                </CardTitle>
                <CardDescription>
                  Enter your TradeZilla credentials to connect your trading
                  account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-mono"
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono"
                    data-testid="input-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="server">Server</Label>
                  <Select value={server} onValueChange={setServer}>
                    <SelectTrigger data-testid="select-server">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live.tradelocker.com">
                        Live Server (live.tradelocker.com)
                      </SelectItem>
                      <SelectItem value="demo.tradelocker.com">
                        Demo Server (demo.tradelocker.com)
                      </SelectItem>
                      <SelectItem value="HEROFX">
                        HeroFX Server (HEROFX)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Use Demo Server for testing without real funds.
                  </p>
                </div>

                <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <p className="text-xs text-yellow-500">
                    Your credentials are securely stored and only used to
                    authenticate with TradeZilla. We never store your password
                    in plain text.
                  </p>
                </div>

                <Button
                  onClick={handleConnect}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-bold tracking-wide shadow-[0_0_15px_rgba(0,255,128,0.2)]"
                  disabled={connectMutation.isPending}
                  data-testid="button-connect"
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PlugZap className="w-4 h-4 mr-2" />
                  )}
                  Connect to TradeZilla
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
