from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import models as m
from app.db.session import get_db
from app.domain.schemas import DealerCreate, FactoryCreate, SupplierCreate, WarehouseCreate

router = APIRouter()

_LIST_MODELS = {
    "suppliers": m.Supplier, "factories": m.Factory, "warehouses": m.Warehouse,
    "transport-hubs": m.TransportHub, "dealers": m.Dealer, "products": m.Product,
    "routes": m.Route, "customers": m.Customer,
}


def _serialize(obj) -> dict:
    out = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        out[col.name] = val.isoformat() if hasattr(val, "isoformat") else val
    return out


@router.get("/entities/{kind}")
def list_entities(kind: str, session: Session = Depends(get_db)):
    model = _LIST_MODELS.get(kind)
    if model is None:
        raise HTTPException(404, f"Unknown entity kind '{kind}'")
    rows = session.query(model).all()
    return {"items": [_serialize(r) for r in rows]}


@router.get("/entities/{kind}/{entity_id}")
def get_entity(kind: str, entity_id: str, session: Session = Depends(get_db)):
    model = _LIST_MODELS.get(kind)
    if model is None:
        raise HTTPException(404, f"Unknown entity kind '{kind}'")
    obj = session.get(model, entity_id)
    if obj is None:
        raise HTTPException(404, "Not found")
    return _serialize(obj)


@router.post("/entities/suppliers", status_code=201)
def create_supplier(payload: SupplierCreate, session: Session = Depends(get_db)):
    obj = m.Supplier(**payload.model_dump())
    session.add(obj)
    session.flush()
    session.add(m.AuditEvent(action="create_supplier", entity_type="supplier", entity_id=obj.id))
    session.commit()
    return _serialize(obj)


@router.post("/entities/factories", status_code=201)
def create_factory(payload: FactoryCreate, session: Session = Depends(get_db)):
    obj = m.Factory(**payload.model_dump())
    session.add(obj)
    session.flush()
    session.add(m.AuditEvent(action="create_factory", entity_type="factory", entity_id=obj.id))
    session.commit()
    return _serialize(obj)


@router.post("/entities/warehouses", status_code=201)
def create_warehouse(payload: WarehouseCreate, session: Session = Depends(get_db)):
    obj = m.Warehouse(**payload.model_dump())
    session.add(obj)
    session.flush()
    session.add(m.AuditEvent(action="create_warehouse", entity_type="warehouse", entity_id=obj.id))
    session.commit()
    return _serialize(obj)


@router.post("/entities/dealers", status_code=201)
def create_dealer(payload: DealerCreate, session: Session = Depends(get_db)):
    obj = m.Dealer(**payload.model_dump())
    session.add(obj)
    session.flush()
    session.add(m.AuditEvent(action="create_dealer", entity_type="dealer", entity_id=obj.id))
    session.commit()
    return _serialize(obj)


@router.post("/admin/reset-demo-data")
def reset_demo_data(session: Session = Depends(get_db)):
    from app.data.seed import seed_all
    session.close()
    seed_all(reset=True)
    return {"status": "reseeded"}
