import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  status?: 'good' | 'warning' | 'critical';
  simulated?: boolean;
}

const statusColors = {
  good: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  critical: 'bg-destructive/20 text-destructive',
};

const dotColors = {
  good: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

export function MetricCard({ icon: Icon, label, value, sub, status = 'good', simulated }: MetricCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-md', statusColors[status])}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {simulated && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">SIM</span>
          )}
          <div className={cn('h-2 w-2 rounded-full animate-pulse-glow', dotColors[status])} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
