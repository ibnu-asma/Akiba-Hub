import { Icon } from '@/components/icon';

export default function AppLoading() {
  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 text-slate-400">
      <Icon name="chart" className="h-8 w-8 animate-pulse text-emerald-500" />
      <p className="text-sm font-medium animate-pulse">Loading...</p>
    </div>
  );
}
