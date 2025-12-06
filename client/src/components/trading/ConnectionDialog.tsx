import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Server, ShieldCheck, Globe } from "lucide-react";

export function ConnectionDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = () => {
    setIsLoading(true);
    // Simulate connection delay
    setTimeout(() => {
      setIsLoading(false);
      setIsOpen(false);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Globe className="w-5 h-5 text-primary" />
            Connect Broker
          </DialogTitle>
          <DialogDescription>
            Configure your connection to TradeLocker or MetaTrader gateway.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tradelocker" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="tradelocker">TradeLocker</TabsTrigger>
            <TabsTrigger value="mt5">MetaTrader 5</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tradelocker" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="server">Environment</Label>
              <Select defaultValue="demo">
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">TradeLocker Demo</SelectItem>
                  <SelectItem value="live">TradeLocker Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email / Account ID</Label>
              <div className="relative">
                <Server className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="email" placeholder="Enter account email" className="pl-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-server">Server URL (Optional)</Label>
              <Input id="api-server" placeholder="https://demo.tradelocker.com/api" />
            </div>
          </TabsContent>

          <TabsContent value="mt5" className="space-y-4 mt-4">
            <div className="p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-md flex gap-3">
              <ShieldCheck className="w-5 h-5 text-yellow-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-500">Bridge Required</p>
                <p className="text-xs text-muted-foreground">
                  MT5 requires a running Python/Node.js bridge or EA to accept commands via API.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bridge Endpoint</Label>
              <Input placeholder="http://localhost:3000" />
            </div>
            <div className="space-y-2">
              <Label>Auth Token</Label>
              <Input type="password" placeholder="Bridge secret key" />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleConnect} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isLoading ? "Connecting..." : "Connect Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}