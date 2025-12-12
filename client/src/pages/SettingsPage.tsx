import { Sidebar } from "@/components/trading/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cloud, Server, Cpu, Zap, Bell, Lock, Key, ShieldCheck } from "lucide-react";
import { useBrokerStatus } from "@/lib/api";
import generatedImage from '@assets/generated_images/dark_futuristic_digital_trading_background_with_neon_data_streams.png';

export default function SettingsPage() {
  const { data: brokerStatus } = useBrokerStatus();
  const isConnected = brokerStatus?.connected && brokerStatus?.accountNumber;

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url(${generatedImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="z-10 relative">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 overflow-y-auto z-10 relative h-screen">
        <header className="mb-6 flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground tracking-wide flex items-center gap-2">
              SYSTEM SETTINGS <span className="text-muted-foreground">///</span>
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              CONFIGURATION & DEPLOYMENT
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant={isConnected ? "outline" : "secondary"} className={isConnected ? "border-primary/40 text-primary bg-primary/10" : "bg-muted text-muted-foreground"}>
              {isConnected ? `Broker connected • #${brokerStatus?.accountNumber}` : "Broker not connected"}
            </Badge>
            <Badge variant="outline" className="border-accent/30 text-accent bg-accent/10 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Secrets encrypted at rest
            </Badge>
            <Badge variant="outline" className="border-border/60 text-muted-foreground">
              Auto-save enabled
            </Badge>
          </div>
        </header>

        <Tabs defaultValue="hosting" className="max-w-5xl space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-muted/50">
            <TabsTrigger value="hosting">Hosting</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="hosting" className="space-y-6 animate-in fade-in slide-in-from-left-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Replit Deployment Card */}
               <Card className="border-primary/30 bg-card/30 backdrop-blur-sm shadow-[0_0_20px_rgba(0,255,128,0.05)]">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2 text-primary">
                     <Cloud className="w-5 h-5" />
                     Cloud Hosting (No VPS)
                   </CardTitle>
                   <CardDescription>
                     Deploy your bot to a managed cloud environment that runs 24/7.
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                   <div className="p-4 rounded bg-primary/5 border border-primary/10 space-y-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                         <span className="font-medium">Status</span>
                       </div>
                       <Badge variant="outline" className="border-muted-foreground text-muted-foreground">OFFLINE</Badge>
                     </div>
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Cpu className="w-4 h-4 text-muted-foreground" />
                         <span className="font-medium">Compute</span>
                       </div>
                       <span className="font-mono text-sm">Reserved VM (1 vCPU, 2GB)</span>
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <Label>Auto-Scale Strategy</Label>
                     <p className="text-xs text-muted-foreground mb-2">
                       Automatically increase resources during high-volatility sessions.
                     </p>
                     <Switch defaultChecked />
                   </div>

                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-bold tracking-wide shadow-[0_0_15px_rgba(0,255,128,0.2)]">
                     <Zap className="w-4 h-4 mr-2" /> DEPLOY TO CLOUD
                   </Button>
                   <p className="text-[10px] text-center text-muted-foreground">
                     * Uses Replit Reserved VM. No external VPS configuration required.
                   </p>
                 </CardContent>
               </Card>

               {/* Manual Connection Card */}
                   <Card className="border-border/50 bg-card/30 backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2 text-muted-foreground">
                     <Server className="w-5 h-5" />
                     Self-Hosted / VPS
                   </CardTitle>
                   <CardDescription>
                     Connect to your own Ubuntu/Windows server via SSH.
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="space-y-2">
                     <Label>Host IP</Label>
                     <Input placeholder="192.168.x.x" className="font-mono" disabled />
                   </div>
                   <div className="space-y-2">
                     <Label>Port</Label>
                     <Input placeholder="22" className="font-mono" disabled />
                   </div>
                   <Button variant="outline" className="w-full" disabled>
                     Connect via SSH
                   </Button>
                 </CardContent>
               </Card>
            </div>
          </TabsContent>

          <TabsContent value="api" className="space-y-6 animate-in fade-in slide-in-from-left-2">
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-accent" />
                  Exchange Credentials
                </CardTitle>
                <CardDescription>Securely stored in environment variables.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>TradeLocker API Key</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="sk_live_xxxxxxxxxxxxxxxx" readOnly className="font-mono bg-muted/30" />
                    <Button variant="outline" size="icon"><Lock className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Account Secret</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="••••••••••••••••" readOnly className="font-mono bg-muted/30" />
                    <Button variant="outline" size="icon"><Lock className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="p-3 rounded border border-border/50 bg-background/40 text-xs text-muted-foreground flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 mt-0.5 text-accent" />
                  <span>
                    Keys are stored server-side and never exposed to the client. Rotate credentials after changing brokers.
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 animate-in fade-in slide-in-from-left-2">
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-yellow-500" />
                  Alert Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center justify-between p-3 border border-border/50 rounded bg-background/30">
                   <div className="space-y-0.5">
                     <Label>Telegram Alerts</Label>
                     <p className="text-xs text-muted-foreground">Send trade execution logs to Telegram bot</p>
                   </div>
                   <Switch defaultChecked />
                 </div>
                 <div className="flex items-center justify-between p-3 border border-border/50 rounded bg-background/30">
                   <div className="space-y-0.5">
                     <Label>Email Digests</Label>
                     <p className="text-xs text-muted-foreground">Daily performance summary</p>
                   </div>
                   <Switch />
                 </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}