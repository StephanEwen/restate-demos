


## Example Commands

```shell
curl localhost:8080/ipScanner/scanIpRange --json '[
{ "from": 8, "to": 8 },
{ "from": 8, "to": 9 },
{ "from": 1, "to": 10 },
{ "from": 0, "to": 255 }
]'
```