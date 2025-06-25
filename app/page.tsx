import Header from '@/components/header';
import Dashboard from '@/components/dashboard';

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <Dashboard />
      </main>
    </>
  );
}
