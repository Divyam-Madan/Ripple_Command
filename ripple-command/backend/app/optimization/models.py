from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RecoveryCandidate:
    type: str  # expedite_shipment | alternate_supplier | warehouse_reallocation | do_nothing
    description: str
    cost_per_unit: float
    fixed_cost: float
    eta_hours: float
    max_quantity: float
    meets_deadline: bool
    source_label: str = ""

    def cost_for(self, quantity: float) -> float:
        return self.fixed_cost + self.cost_per_unit * quantity
