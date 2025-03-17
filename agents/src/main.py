import restate
from customerservice.customer_service_restate import customer_service_session

app = restate.app(services=[customer_service_session])
