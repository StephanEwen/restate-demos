# Optional External API services

This package contains implementations of the external APIs (called by the
order processing system). The implementation verifies correct interaction from
the order processing system and act as a verification that the processing logic is
consistent.

These external APIs are implemented themselves as separate Restate Services, because
Restate makes it so simple to build correct stateful services.
