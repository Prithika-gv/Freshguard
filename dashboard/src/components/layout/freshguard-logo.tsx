import Image from 'next/image';

export const FreshGuardLogo = () => {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-brand-gold bg-black shadow-glass">
        <Image src="/freshguard-logo.png" alt="FreshGuard logo" fill sizes="64px" className="object-cover" priority />
      </div>
      <div>
        <p className="font-display text-2xl font-bold tracking-[0.08em] text-white">FRESHGUARD</p>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-brand-gold">Preventing Food Loss Before It Happens — Bio Sentinel</p>
      </div>
    </div>
  );
};
