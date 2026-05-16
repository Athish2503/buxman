import { useState, useEffect } from "react";
import { ChevronLeft, Trash2, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FinancialNotification from "@/lib/financial-notifications";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Diagnostics = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const data = await FinancialNotification.getDiagnostics();
      setHistory(data.history || []);
    } catch (e) {
      console.error("Failed to load diagnostics", e);
      toast.error("Failed to load diagnostics history");
    } finally {
      setLoading(false);
    }
  };

  const clearDiagnostics = async () => {
    try {
      await FinancialNotification.clearDiagnostics();
      setHistory([]);
      toast.success("Diagnostics cleared");
    } catch (e) {
      toast.error("Failed to clear diagnostics");
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B10] text-white p-4 pb-20">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Engine Diagnostics</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={loadDiagnostics}
            disabled={loading}
            className="text-white/60"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearDiagnostics}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
          <p>No capture history found</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="space-y-4 pr-4">
            {history.map((item, idx) => (
              <DiagnosticItem key={idx} data={item} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

const DiagnosticItem = ({ data }: { data: any }) => {
  const isAccepted = data.type === 'ATTEMPT' && data.confidence >= 65;
  const isRejected = data.type === 'REJECTION' || (data.type === 'ATTEMPT' && data.confidence < 65);
  
  return (
    <Card className="p-4 bg-white/5 border-white/10 overflow-hidden">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant={isAccepted ? "default" : "destructive"} className={isAccepted ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : ""}>
              {data.type === 'REJECTION' ? 'REJECTED' : isAccepted ? 'ACCEPTED' : 'FILTERED'}
            </Badge>
            <span className="text-[10px] text-white/30">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <span className="text-[11px] text-purple-400 font-medium">Source: {data.source}</span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white/90">
            {data.amount > 0 ? `₹${data.amount}` : '—'}
          </div>
          <div className="text-[10px] text-white/40">Confidence: {data.confidence}%</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="p-2 bg-black/40 rounded text-[11px] font-mono text-white/60 break-words">
          <div className="text-[9px] text-white/20 mb-1 uppercase tracking-wider">Raw Text</div>
          {data.rawText}
        </div>

        {data.normalizedText && data.normalizedText !== data.rawText && (
          <div className="p-2 bg-black/20 rounded text-[11px] font-mono text-white/50 break-words">
            <div className="text-[9px] text-white/20 mb-1 uppercase tracking-wider">Normalized</div>
            {data.normalizedText}
          </div>
        )}

        {data.reason && (
          <div className="flex items-start gap-2 text-red-400 text-[11px] mt-2">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>Reason: {data.reason}</span>
          </div>
        )}

        {data.matchedKeywords && data.matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.matchedKeywords.map((kw: string) => (
              <span key={kw} className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/10">
                +{kw}
              </span>
            ))}
            {data.negativeKeywords?.map((kw: string) => (
              <span key={kw} className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/10">
                -{kw}
              </span>
            ))}
          </div>
        )}

        {data.scoreBreakdown && (
          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-x-4 gap-y-1">
             {Object.entries(data.scoreBreakdown).map(([k, v]: [string, any]) => (
               <div key={k} className="flex justify-between text-[9px]">
                 <span className="text-white/30">{k}</span>
                 <span className={v > 0 ? "text-emerald-400" : "text-red-400"}>
                   {v > 0 ? `+${v}` : v}
                 </span>
               </div>
             ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Diagnostics;
