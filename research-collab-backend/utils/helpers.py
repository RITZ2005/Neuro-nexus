# utils/helpers.py
from bson import ObjectId

def to_obj_id(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        return None

def fix_id(doc):
    if not doc:
        return doc
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc
