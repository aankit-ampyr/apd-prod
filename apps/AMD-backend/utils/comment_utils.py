from typing import List, Dict, Any


def extract_tagged_users(
    content: List[Dict[str, Any]],
):

    tagged_user_ids = []

    try:

        for block in content:
            if block.get("type") == "mention":
                user_id = block.get("user_id")
                if user_id:
                    tagged_user_ids.append(user_id)

        return tagged_user_ids

    except Exception:
        raise