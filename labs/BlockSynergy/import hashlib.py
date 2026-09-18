import hashlib
import json

block={
      "data": [
         {
      "amount": 5,
      "receiver": "9e9a36c0b4f3c566bb46e867c36634f17a7813eb0cf5a4dc3a49466433f65785f0bb301483dc8b1c8418af89ace2563686b8f790b56c302194f93c6da8106729",
      "sender": "Blockchain_Reward",
      "signature": "Blockchain",
      "timestamp": "2026-09-15 05:09:27.050533"
    }
      ],
      "index": 6,
      "nonce": 0,
      "previous_hash": "00000d39b0fe6243570ae0c7a89a990b37cd77b8e3ac937b078fb9467c1d2f5e",
      "timestamp": "2026-09-15 02:54:37.240198"
    }


diff="00000"
print(type(block))
while True:
    raw=str(block["index"])+block["previous_hash"]+block["timestamp"]+json.dumps(block["data"])+str(block["nonce"])
    hash_result=hashlib.sha256(raw.encode()).hexdigest()
    if (hash_result.startswith(diff)):
        
        block["hash"]=hash_result
        print(json.dumps(block))
        break
    block["nonce"]+=1