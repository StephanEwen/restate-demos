from __future__ import annotations as _annotations

import restate
import uuid
from pydantic import BaseModel
from agents import (
    Agent,
    HandoffOutputItem,
    ItemHelpers,
    MessageOutputItem,
    RunContextWrapper,
    RunResult,
    ToolCallItem,
    ToolCallOutputItem,
    function_tool,
)
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX
from customerservice.restate_runner.restate_agent_runner import RestateRunner

from customerservice import service_apis

# -----------------------------------------------------------------------------
#  Order Status Agent
# -----------------------------------------------------------------------------

@function_tool(
    name_override="get_order_status",
    description_override="Gets the life cycle status of the order."
)
async def get_order_status(
        context: RunContextWrapper[restate.ObjectContext], order_id: str
) -> str:
    """
    Queries the order service to get the life cycle status of a specified order.

    Args:
        order_id: The unique order id by which to identify the order.
    """
    order_status = await context.context.object_call(
        service_apis.getStatus,
        key=order_id,
        arg=None
    )

    print(f"CALL RESULT = {order_status}")

    if order_status is None or order_status == "NONE":
        return f"Could not find the order with number {order_id}"

    return f"Status of order {order_id} is {order_status}"

@function_tool(
    name_override="get_pending_order_items",
    description_override="Gets the pending items of the order, i.e., items that have not been booked"
)
async def get_pending_order_items(
        context: RunContextWrapper[restate.ObjectContext], order_id: str
) -> str:
    """
    Queries the order service to get the pending items of the order, i.e., items that have not been booked

    Args:
        order_id: The unique order id by which to identify the order.
    """
    items = await context.context.object_call(
        service_apis.getPendingOrders,
        key=order_id,
        arg=None
    )

    print(f"CALL RESULT = {items}")

    if items is None:
        return f"Could not find the order with number {order_id}"

    return f"The order {order_id} contains these pending order items {items}"

@function_tool(
    name_override="get_booked_order_items",
    description_override="Gets the booked items of the order, i.e., items that have been successfully ordered"
)
async def get_booked_order_items(
        context: RunContextWrapper[restate.ObjectContext], order_id: str
) -> str:
    """
    Queries the order service to get the booked items of the order, i.e., items that have been successfully ordered

    Args:
        order_id: The unique order id by which to identify the order.
    """
    items = await context.context.object_call(
        service_apis.getBookedOrders,
        key=order_id,
        arg=None
    )

    print(f"CALL RESULT = {items}")

    if items is None:
        return f"Could not find the order with number {order_id}"

    return f"The order {order_id} contains these completed order items {items}"

order_status_agent = Agent[restate.ObjectContext](
    name="Order Status Agent",
    handoff_description="A helpful agent that can help you with checking the status and details of a specific order.",
    instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
    You are an order status agent. If you are speaking to a customer, you probably were transferred to from the triage agent.
    Use the following routine to support the customer.
    # Routine
    1. Make sure you know the life cycle status of the order. Use the order status tool to retrieve it if you don't know it yet. If you don't get back a value via that tool, an order with that id not exist.
    2. If this is the first interaction with the customer, report the order life cycle status.
    3. Always ask the customer what other details they are interested in.
    4. For an order that is still open, you can retrieve the order's items via the pending order items tool.
    5. For an order that is closed or failed or reversed, you can check the order items that were booked via booked order items tool.
    If the customer asks a question that is not related to the routine, transfer back to the triage agent. """,
    tools=[get_order_status, get_pending_order_items, get_booked_order_items],
)

# -----------------------------------------------------------------------------
#  Order placement agent
# -----------------------------------------------------------------------------

@function_tool(
    name_override="create_new_order",
    description_override="Create a new empty order."
)
async def create_new_order(
        context: RunContextWrapper[restate.ObjectContext]) -> str:
    """
    Creates a new empty order and returns the order id.
    """
    
    restateCtx = context.context
    order_id = await restateCtx.run("create unique order id", lambda: str(uuid.uuid4()))

    try:
        await restateCtx.object_call(
            service_apis.create,
            key=order_id,
            arg=None
        )
    except Exception as e:
        return f"Could not create order {order_id}: {str(e)}"

    return f"Created a new order with id: {order_id}"

@function_tool(
    name_override="execute_order",
    description_override="Executes an order."
)
async def execute_order(
        context: RunContextWrapper[restate.ObjectContext], order_id: str) -> str:
    """
    Tries to execute the order with the provided order id. The execution will try to book all order items.
    It will fail if one of the items cannot be booked, in which case all items will be released.

    Args:
        order_id: The unique order id by which to identify the order.
    """

    restateCtx = context.context

    try:
        result = await restateCtx.object_call(
            service_apis.close,
            key=order_id,
            arg=None
        )
    except Exception as e:
        result = f"Could not execute order {order_id}: {str(e)}"

    return f"Tried to execute order, the result was {result}"

@function_tool(
    name_override="cancel_order",
    description_override="Cancels or reverses an order."
)
async def cancel_order(
        context: RunContextWrapper[restate.ObjectContext], order_id: str) -> str:
    """
    Cancel the order with the provided order id. This will release all earmarks on items of this order.
    If the order was previously executed successfully, this will reverse the order instead.

    Args:
        order_id: The unique order id by which to identify the order.
    """

    restateCtx = context.context

    try:
        result = await restateCtx.object_call(
            service_apis.cancel,
            key=order_id,
            arg=None
        )
    except Exception as e:
        result = f"Could not cancel or revert order {order_id}: {str(e)}"

    return f"Canceling order resulted in {result}"

@function_tool(
    name_override="add_order_item",
    description_override="Adds an item to the order."
)
async def add_order_item(
        context: RunContextWrapper[restate.ObjectContext],
        order_id: str,
        asset_name: str,
        asset_quantity: int) -> bool:
    """
    Adds an item to the order. An item is an asset specified by a name and a quantity.
    If the order was previously executed successfully, this will reverse the order instead.

    Args:
        order_id: The unique order id by which to identify the order to which to add the item.
        asset_name: The name of the asset in the order item.
        asset_quantity: The quantity of the asset in the order item. 
    """

    restateCtx = context.context

    item = service_apis.Asset(name=asset_name, quantity=asset_quantity)

    try:
        result = await restateCtx.object_call(
            service_apis.addOrder,
            key=order_id,
            arg=item
        )
    except Exception as e:
        return f"Failed to add item to {order_id}: {str(e)}"

    if result:
        return f"Item {item} was successfully added to order {order_id}"
    else:
        return f"Could not add {item} to order {order_id}"


order_placement_agent = Agent[restate.ObjectContext](
    name="Order Placement Agent",
    handoff_description="A helpful agent that can manage orders. The agent can create orders, add items, and exeute or cancel the order.",
    instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
    You are an order placement agent. If you are speaking to a customer, you probably were transferred to from the triage agent.
    Use the following routine to support the customer.
    # Routine
    1. Ask the user what type of action they want to do, for example creating an order, or making changes to an exicting one.
    2. To modify an existign order, you need to know the order id, ask the user for it, if you don't know it already. 
    3. To create a new order, you do not need to know the order id.
    4. Use the tools available to you to process the requested action.
    5. The status of an order can always change in the background, so you cannot rely on your context or history for the status. Delegate status questions to other agents instead.
    If the customer asks a question that is not related to the routine, transfer back to the triage agent. """,
    tools=[create_new_order, add_order_item, execute_order, cancel_order],
)

# -----------------------------------------------------------------------------
#  Triage Agent
# -----------------------------------------------------------------------------

triage_agent = Agent[restate.ObjectContext](
    name="Triage Agent",
    handoff_description="A triage agent that collects basic information and then delegates a customer's request to the appropriate agent.",
    instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
    You are a helpful triaging agent. You can use your tools to delegate questions to other appropriate agents.""",
    handoffs=[order_status_agent, order_placement_agent],
)

order_status_agent.handoffs.append(triage_agent)
order_placement_agent.handoffs.append(triage_agent)

AGENTS = {
    triage_agent.name: triage_agent,
    order_status_agent.name: order_status_agent,
    order_placement_agent.name: order_placement_agent,
}

# -----------------------------------------------------------------------------
#  Entry point hosting the agents
# -----------------------------------------------------------------------------

class CustomerChatRequest(BaseModel):
    user_input: str

customer_service_session = restate.VirtualObject("CustomerServiceSession")

@customer_service_session.handler()
async def chat(ctx: restate.ObjectContext, req: CustomerChatRequest) -> None:

    # Retrieve the current agent of this session
    current_agent_name = await ctx.get("current_agent_name") or triage_agent.name
    current_agent: Agent[restate.ObjectContext] = AGENTS[current_agent_name]

    # Run the input through the agent
    input_items = await ctx.get("input_items") or []
    input_items.append({"content": req.user_input, "role": "user"})

    result: RunResult = await RestateRunner.run(
        current_agent,
        input_items,
        max_turns=10,
        context=ctx)
    
    input_items = result.to_input_list()
    ctx.set("input_items", input_items)
    ctx.set("current_agent_name", result.last_agent.name)

    return prettify_response(result)


def prettify_response(result: RunResult):
    last_item = result.new_items[-1]
    response = ""

    if isinstance(last_item, MessageOutputItem):
        response += f"{ItemHelpers.text_message_output(last_item)}\n\n--- Detailed Steps: ---\n\n"

    for new_item in result.new_items:
        agent_name = new_item.agent.name
        if isinstance(new_item, MessageOutputItem):
            print(f"{agent_name}: {ItemHelpers.text_message_output(new_item)}")
            response += f"{agent_name}: {ItemHelpers.text_message_output(new_item)}\n"
        elif isinstance(new_item, HandoffOutputItem):
            print(f"Handed off from {new_item.source_agent.name} to {new_item.target_agent.name}")
            response += f"Handed off from {new_item.source_agent.name} to {new_item.target_agent.name}\n"
        elif isinstance(new_item, ToolCallItem):
            print(f"{agent_name}: Calling a tool")
            response += f"{agent_name}: Calling a tool\n"
        elif isinstance(new_item, ToolCallOutputItem):
            print(f"{agent_name}: Tool call output: {new_item.output}")
            response += f"{agent_name}: Tool call output: {new_item.output}\n"

    return response


##### BACKUP

    # You are a helpful triaging agent. You gather the basic required information for the support request and can use your tools to delegate questions to other appropriate agents.
    # Use the following routine to support the customer.
    # # Routine
    # 1. You must know the order id of the order the user wants to interact with. If you don't know the order id, ask the user for it.
    # 2. At any point, the user may specify that they want to examine a different order and specify a new order id.
    # 3. For all other matters, delegate questions to other appropriate agents.""",