export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-transparent bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-3xl mx-auto flex flex-col items-start py-6 px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          BunkerCoin Explorer 
          <span className="block sm:inline">
            <span className="text-lg font-normal ml-0 sm:ml-2">v0.0.2</span> 
            <span className="text-sm font-normal bg-emerald-500/20 text-emerald-500 px-1.5 py-1 rounded-md ml-2">Pre-Alpha</span>
          </span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-normal">
          A minimal blockchain explorer for BunkerCoin - running Alpenglow on top of a simulated shortwave radio network.
        </p>
      </div>
    </header>
  );
} 