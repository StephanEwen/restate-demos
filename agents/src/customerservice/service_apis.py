from __future__ import annotations as _annotations

import restate
from pydantic import BaseModel

# -----------------------------------------------------------------------------
#  These definitions mirror the type definitions and sigantures in the
#  TypeScript code that implements the order processing logic.
#
#  They only exist because we use two different progamming languages, and
#  because defining the schema with separate tools (OpenAPI, Protobuf, ...)
#  is beyond the scope of this demo code.
# -----------------------------------------------------------------------------

class Asset(BaseModel):
    name: str
    quantity: int

class EarmarkedItem(BaseModel):
    reservationId: str
    asset: Asset

class BookedItem(BaseModel):
    orderId: str
    asset: Asset


orderService = restate.VirtualObject("bulkOrder")

@orderService.handler()
async def getStatus(ctx: restate.ObjectContext) -> str | None:
    pass

@orderService.handler()
async def getBookedOrders(ctx: restate.ObjectContext) -> str | None:
    pass

@orderService.handler()
async def getPendingOrders(ctx: restate.ObjectContext) -> str | None:
    pass

@orderService.handler()
async def create(ctx: restate.ObjectContext) -> None:
    pass

@orderService.handler()
async def addOrder(ctx: restate.ObjectContext, item: Asset) -> bool:
    pass

@orderService.handler()
async def close(ctx: restate.ObjectContext) -> bool:
    pass

@orderService.handler()
async def cancel(ctx: restate.ObjectContext) -> str:
    pass
