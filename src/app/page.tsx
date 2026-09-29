import { getAllOrders } from "@/lib/orders";
import { VoiceAgent } from "@/components/VoiceAgent";
import { TestOrderCard } from "@/components/TestOrderCard";

export default async function Home() {
  const orders = await getAllOrders();
  
  return (
    <div className="min-h-screen font-sans selection:bg-[var(--color-brand-green-light)] selection:text-[var(--color-brand-green)]">
      
      {/* HEADER */}
      <header className="bg-white border-b border-[var(--color-brand-border)] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-navy)] rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl leading-none">A</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-navy)]">
              Aura <span className="text-[var(--color-muted)] font-medium text-lg">Support</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)] bg-[var(--color-soft-bg)] px-4 py-2 rounded-lg border border-[var(--color-brand-border)]">
               Sandbox Mode
             </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        
        {/* VOICE AGENT (Includes Hero, Transcript, Activity, Test Orders, and Summary) */}
        <VoiceAgent>
          {/* TEST ORDERS SECTION */}
          <section className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-navy-dark)]">Test Orders</h2>
              <span className="text-[11px] font-bold bg-[var(--color-brand-border)] text-[var(--color-muted)] px-2.5 py-1 rounded-md uppercase tracking-wider">Evaluation Data</span>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => (
                <TestOrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        </VoiceAgent>

      </main>
      
      {/* FOOTER */}
      <footer className="border-t border-[var(--color-brand-border)] py-10 mt-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm font-medium text-[var(--color-muted)]">
          <p>Aura Voice Agent &mdash; AI Customer Support Prototype</p>
        </div>
      </footer>
    </div>
  );
}
