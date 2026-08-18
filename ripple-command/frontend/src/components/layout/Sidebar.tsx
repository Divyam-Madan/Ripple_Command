import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Control Tower", exact: true },
  { to: "/digital-twin", label: "Digital Twin" },
  { to: "/shipments", label: "Shipments" },
  { to: "/simulator", label: "What-If Simulator" },
  { to: "/disruptions", label: "Disruption Center" },
  { to: "/analytics", label: "Analytics" },
  { to: "/scenarios", label: "Scenario Library" },
  { to: "/admin", label: "Admin" },
];

export function Sidebar() {
  return (
    <nav className="flex w-[220px] shrink-0 flex-col border-r border-black/20 bg-charcoal-900 text-stone-100">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="text-[13px] font-semibold tracking-wide text-stone-50">RIPPLE Command</div>
        <div className="mt-0.5 text-[11px] text-stone-300/70">AROC &middot; Predict. Simulate. Prescribe.</div>
      </div>
      <div className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `block rounded-sm px-3 py-2 text-[13px] transition-colors ${
                isActive
                  ? "bg-white/10 text-stone-50 font-medium"
                  : "text-stone-300/80 hover:bg-white/5 hover:text-stone-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <div className="border-t border-white/10 px-4 py-3 text-[11px] text-stone-300/50">
        Autonomous Resilient
        <br />
        Operations Center
      </div>
    </nav>
  );
}
