import SimulationForm from "@/components/SimulationForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 py-12">
      <header className="mb-10 max-w-2xl text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-emerald-400">
          Quant-as-a-Service
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
          Monte Carlo Expected Credit Loss
        </h1>
        <p className="mt-3 text-slate-400">
          Tune the macro scenario, pick a compute method, and run a portfolio
          ECL simulation. Choose a preset or dial in unemployment, interest
          rates, and the housing price index by hand.
        </p>
      </header>

      <SimulationForm />

      <footer className="mt-10 text-center text-xs text-slate-600">
        Backend: FastAPI on <span className="font-mono">:8080</span> · hazard-rate
        credit-risk model (PD, LGD 45%, $250K avg exposure)
      </footer>
    </main>
  );
}
