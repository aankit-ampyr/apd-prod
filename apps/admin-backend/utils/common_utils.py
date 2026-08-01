import json


def safe_json_load(data):
    if data is None or not isinstance(data, str):
        return data

    try:
        parsed = json.loads(data)

        if isinstance(parsed, str):
            return json.loads(parsed)

        return parsed
    except (json.JSONDecodeError, TypeError):
        return data
