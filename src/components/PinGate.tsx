import { useState, useCallback } from 'react';
import { verifyPin, isPinSet, setPin } from '@/lib/pin';
import { cn } from '@/lib/utils';
import { Lock, Delete } from 'lucide-react';

interface PinGateProps {
  onUnlock: () => void;
}

export function PinGate({ onUnlock }: PinGateProps) {
  const [pin, setCurrentPin] = useState('');
  const [error, setError] = useState(false);
  const [mode] = useState<'verify' | 'create'>(!isPinSet() ? 'create' : 'verify');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');

  const handleDigit = useCallback((digit: string) => {
    setError(false);
    const current = step === 'confirm' ? confirmPin : pin;
    if (current.length >= 6) return;
    const newVal = current + digit;

    if (step === 'confirm') {
      setConfirmPin(newVal);
      if (newVal.length === 6) {
        if (newVal === pin) {
          setPin(newVal).then(onUnlock);
        } else {
          setError(true);
          setTimeout(() => { setConfirmPin(''); setError(false); }, 600);
        }
      }
    } else {
      setCurrentPin(newVal);
      if (newVal.length === 6) {
        if (mode === 'create') {
          setStep('confirm');
        } else {
          verifyPin(newVal).then((ok) => {
            if (ok) onUnlock();
            else {
              setError(true);
              setTimeout(() => { setCurrentPin(''); setError(false); }, 600);
            }
          });
        }
      }
    }
  }, [pin, confirmPin, step, mode, onUnlock]);

  const handleDelete = () => {
    setError(false);
    if (step === 'confirm') {
      setConfirmPin((p) => p.slice(0, -1));
    } else {
      setCurrentPin((p) => p.slice(0, -1));
    }
  };

  const currentValue = step === 'confirm' ? confirmPin : pin;
  const title = mode === 'create'
    ? step === 'confirm' ? 'Confirme o PIN' : 'Crie um PIN de 6 dígitos'
    : 'Digite o PIN';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="flex items-center gap-2 mb-8">
        <Lock className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      <div className="flex gap-3 mb-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 w-4 rounded-full border-2 transition-all duration-200',
              i < currentValue.length
                ? error ? 'bg-destructive border-destructive' : 'bg-primary border-primary'
                : 'border-muted-foreground/40'
            )}
          />
        ))}
      </div>

      {error && <p className="text-destructive text-sm mb-4">{step === 'confirm' ? 'PINs não coincidem' : 'PIN incorreto'}</p>}

      <div className="grid grid-cols-3 gap-4 max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleDigit(String(n))}
            className="h-16 w-16 rounded-full bg-card border border-border text-xl font-semibold text-foreground hover:bg-secondary transition-colors active:scale-95"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit('0')}
          className="h-16 w-16 rounded-full bg-card border border-border text-xl font-semibold text-foreground hover:bg-secondary transition-colors active:scale-95"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-16 w-16 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
