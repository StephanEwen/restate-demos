# Set up the service 

Create a venv and install the requirements file:

```shell
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Start the service with the agent:

```shell
python -m hypercorn --config hypercorn-config.toml src/main:app
```

Register the service via CLI or Restate UI (runs on localhost:9090 by default)

The main file is [customer_service_restate.py](src/customerservice/customer_service_restate.py)

## Some promts

Go to the Restate UI (https://localhost:9070)

Use the UI's playground to send invocations.
* Under 'Overview', click on the Service `CustomerServiceSession`
* Click on the 'Playground' button.
* Click on the 'chat' endpoint
* The key determines the session (e.g., "my-session"). Note that different keys
  have different agent context (are like different agent instances)
* Put the `user_input` field in the body for the actual prompt.

Exmaple prompts
1. Create an order for me and tell me the order-id.
2. Add 10 Apple Stock to the Order
3. Add 50 NVIDIA stock to the Order
4. What is the status of the order?
5. Execute the order.
